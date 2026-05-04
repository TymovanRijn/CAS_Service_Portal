const { pool } = require('../config/db');
const fs = require('fs');
const puppeteer = require('puppeteer');

/** Veilige tekst voor HTML/PDF */
const escapeHtml = (s) => {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const normalizeLoc = (name) => {
  const n = (name || '').trim();
  return n === '' ? 'Algemeen' : n;
};

/** Systeem-Chromium als de gebundelde browser ontbreekt of crasht (typisch op Linux servers). */
function resolveChromiumExecutable() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * PDF via Puppeteer. Gooit bij falen zodat de caller HTML-fallback kan sturen.
 */
async function renderPdfWithPuppeteer(htmlContent) {
  const executablePath = resolveChromiumExecutable();

  const launchOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--font-render-hinting=none',
    ],
    timeout: 90000,
  };
  if (executablePath) {
    launchOpts.executablePath = executablePath;
  }

  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    });
    await page.setContent(htmlContent, {
      waitUntil: 'load',
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 400));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      landscape: false,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await page.close().catch(() => {});

    if (!pdfBuffer || !pdfBuffer.length) {
      throw new Error('PDF buffer leeg');
    }
    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// Generate daily report for a specific date
const generateDailyReport = async (req, res) => {
  const { date } = req.query; // Expected format: YYYY-MM-DD
  
  if (!date) {
    return res.status(400).json({ message: 'Date parameter is required (YYYY-MM-DD format)' });
  }

  try {
    const client = await pool.connect();
    
    // Validate date format
    const reportDate = new Date(date);
    if (isNaN(reportDate.getTime())) {
      client.release();
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    /* Incidenten: gemeld óf gesloten op deze datum (overlap met SAC-dagstaat) */
    const incidentsQuery = `
      SELECT DISTINCT ON (i.id)
        i.*,
        c.name AS category_name,
        l.name AS location_name,
        creator.username AS created_by_name,
        (DATE(i.created_at) = $1::date) AS reported_this_day,
        (DATE(i.updated_at) = $1::date AND i.status = 'Closed') AS closed_this_day
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      LEFT JOIN Users creator ON i.created_by = creator.id
      WHERE DATE(i.created_at) = $1::date
         OR (DATE(i.updated_at) = $1::date AND i.status = 'Closed')
      ORDER BY i.id, i.updated_at DESC
    `;

    const incidentsResult = await client.query(incidentsQuery, [date]);
    const incidents = incidentsResult.rows;

    // Get actions for the specified date (created or updated)
    const actionsQuery = `
      SELECT 
        a.*,
        i.title as incident_title,
        i.priority as incident_priority,
        assigned_user.username as assigned_to_name,
        creator.username as created_by_name,
        c.name as category_name,
        l.name as location_name
      FROM Actions a
      LEFT JOIN Incidents i ON a.incident_id = i.id
      LEFT JOIN Users assigned_user ON a.assigned_to = assigned_user.id
      LEFT JOIN Users creator ON a.created_by = creator.id
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      WHERE DATE(a.created_at) = $1::date OR DATE(a.updated_at) = $1::date
      ORDER BY a.created_at DESC
    `;
    
    const actionsResult = await client.query(actionsQuery, [date]);
    const actions = actionsResult.rows;

    // Get statistics for the day
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM Incidents WHERE DATE(created_at) = $1) as incidents_created,
        (SELECT COUNT(*) FROM Incidents WHERE DATE(updated_at) = $1 AND status = 'Closed') as incidents_closed,
        (SELECT COUNT(*) FROM Actions WHERE DATE(created_at) = $1) as actions_created,
        (SELECT COUNT(*) FROM Actions WHERE DATE(updated_at) = $1 AND status = 'Completed') as actions_completed,
        (SELECT COUNT(*) FROM Incidents WHERE DATE(created_at) = $1 AND priority = 'High') as high_priority_incidents,
        (SELECT COUNT(*) FROM Incidents WHERE DATE(created_at) = $1 AND priority = 'Medium') as medium_priority_incidents,
        (SELECT COUNT(*) FROM Incidents WHERE DATE(created_at) = $1 AND priority = 'Low') as low_priority_incidents
    `;
    
    const statsResult = await client.query(statsQuery, [date]);
    const row = statsResult.rows[0] || {};
    const stats = {
      incidents_created: Number(row.incidents_created) || 0,
      incidents_closed: Number(row.incidents_closed) || 0,
      actions_created: Number(row.actions_created) || 0,
      actions_completed: Number(row.actions_completed) || 0,
      high_priority_incidents: Number(row.high_priority_incidents) || 0,
      medium_priority_incidents: Number(row.medium_priority_incidents) || 0,
      low_priority_incidents: Number(row.low_priority_incidents) || 0,
    };

    client.release();

    const htmlContent = generateReportHTML({
      date,
      incidents,
      actions,
      stats,
    });

    let pdfBuffer;
    try {
      pdfBuffer = await renderPdfWithPuppeteer(htmlContent);
    } catch (pdfErr) {
      console.error('PDF generation failed, HTML fallback:', pdfErr.message);
      const htmlName = `CAS_Dagrapport_${date.replace(/-/g, '_')}.html`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${htmlName}"`);
      res.setHeader('X-Report-Format', 'html-fallback');
      return res.send(Buffer.from(htmlContent, 'utf8'));
    }

    const filename = `CAS_Dagrapport_${date.replace(/-/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generating daily report:', err);
    res.status(500).json({ message: 'Error generating daily report', error: err.message });
  }
};

// Generate HTML for PDF — SAC-dagrapport (memo, per locatie, open vs afgerond)
const generateReportHTML = ({ date, incidents, actions, stats }) => {
  const formatDateNl = () =>
    new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  /** Titel zoals SAC-voorbeeld: "13 april 2026" */
  const formatDateShortNl = () =>
    new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

  const formatDmY = () =>
    new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });

  const formatTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
      : '';

  const formatGen = () =>
    new Date().toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const boolish = (v) => v === true || v === 't' || v === 'true';

  const incStatusNl = (s) => {
    const x = String(s || '').toLowerCase();
    if (x === 'open') return 'Open';
    if (x === 'in progress') return 'In behandeling';
    if (x === 'closed') return 'Gesloten';
    return escapeHtml(s || '—');
  };

  const actionStatusNl = (s) => {
    const x = String(s || '').toLowerCase();
    if (x === 'pending') return 'Openstaand';
    if (x === 'in progress') return 'In behandeling';
    if (x === 'completed') return 'Voltooid';
    return escapeHtml(s || '—');
  };

  const locKeyFromIncident = (i) => normalizeLoc(i.location_name);
  const locKeyFromAction = (a) => normalizeLoc(a.location_name);

  const truncate = (t, max = 560) => {
    const plain = String(t || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (plain.length <= max) return escapeHtml(plain);
    return `${escapeHtml(plain.slice(0, max))}…`;
  };

  const coordinators = new Set();
  incidents.forEach((i) => {
    if (i.created_by_name) coordinators.add(String(i.created_by_name).trim());
  });
  actions.forEach((a) => {
    if (a.created_by_name) coordinators.add(String(a.created_by_name).trim());
    if (a.assigned_to_name) coordinators.add(String(a.assigned_to_name).trim());
  });
  const sacLineHtml =
    coordinators.size > 0
      ? escapeHtml([...coordinators].sort((a, b) => a.localeCompare(b, 'nl')).join(', '))
      : '—';

  /** Bijzonderheden uit KPI / prioriteit (zelfde velden als incidentformulier) */
  const bijSeen = new Set();
  const bijLines = [];
  const pushBij = (txt) => {
    const key = txt.slice(0, 140);
    if (bijSeen.has(key)) return;
    bijSeen.add(key);
    bijLines.push(`<div class="bij-line">${txt}</div>`);
  };

  incidents.forEach((i) => {
    const prio = String(i.priority || '').toLowerCase();
    if (prio === 'high') {
      pushBij(
        `Prioriteit Hoog · #${i.id} — ${escapeHtml(
          (i.title || '').trim()
        )} (${escapeHtml(locKeyFromIncident(i))}).`
      );
    }
    if (boolish(i.requires_escalation)) {
      pushBij(
        `Escalatie / nabellen · #${i.id}${i.escalation_reason ? ` — ${escapeHtml(String(i.escalation_reason).trim())}` : ''}`
      );
    }
    if (boolish(i.was_unregistered_incident)) {
      pushBij(`Niet‑geregistreerd incident (gemarkeerd SAC) · #${i.id}`);
    }
    if (boolish(i.service_party_arrived_late)) {
      pushBij(`Service party te laat · #${i.id}`);
    }
    if (boolish(i.incorrect_diagnosis)) {
      pushBij(`Verkeerde diagnose (service party) · #${i.id}`);
    }
    if (boolish(i.multiple_service_parties_needed)) {
      pushBij(`Meerdere service parties nodig · #${i.id}`);
    }
  });

  /** Per locatie: incidenten en acties (acties naar locatie gekoppelde incident‑locatie) */
  const byLoc = new Map();
  const blk = (k) => {
    if (!byLoc.has(k))
      byLoc.set(k, { incidents: [], openActions: [], doneActions: [] });
    return byLoc.get(k);
  };

  incidents.forEach((i) => blk(locKeyFromIncident(i)).incidents.push(i));

  actions.forEach((a) => {
    const b = blk(locKeyFromAction(a));
    const st = String(a.status || '').toLowerCase();
    if (st === 'completed') b.doneActions.push(a);
    else b.openActions.push(a);
  });

  const sortedLocs = [...byLoc.keys()].sort((a, b) => {
    if (a === 'Algemeen') return -1;
    if (b === 'Algemeen') return 1;
    return a.localeCompare(b, 'nl', { sensitivity: 'base' });
  });

  const incidentBlock = (i) => {
    const chips = [];
    if (boolish(i.reported_this_day)) chips.push('gemeld vandaag');
    if (boolish(i.closed_this_day)) chips.push('afgesloten vandaag');
    const chipTxt = chips.length ? ` <span class="chip">${chips.join(' · ')}</span>` : '';
    const sol = i.possible_solution ? ` Mogelijke stap: ${truncate(i.possible_solution, 220)}` : '';
    const cat = i.category_name ? `${escapeHtml(i.category_name)} · ` : '';
    const who = i.created_by_name
      ? ` · ${escapeHtml(i.created_by_name)} (${formatTime(i.created_at)})`
      : '';
    return `<p class="entry"><strong>#${i.id}</strong>${chipTxt}<br/><strong>${escapeHtml(
      (i.title || '').trim()
    )}</strong><br/><span class="meta">${cat}${incStatusNl(i.status)} · prio ${escapeHtml(
      String(i.priority || '—')
    )}${who}</span><br/><span class="body">${truncate(i.description, 560)}</span>${sol ? `<br/><span class="body">${sol}</span>` : ''}</p>`;
  };

  const actionBlock = (a) => {
    const incRef = a.incident_id ? ` incident #${a.incident_id}` : '';
    const asg = a.assigned_to_name ? ` · ${escapeHtml(a.assigned_to_name)}` : '';
    return `<p class="entry act">${actionStatusNl(a.status)}${incRef}${asg}<br/><span class="body">${truncate(
      a.action_description,
      420
    )}</span>${a.incident_title ? `<br/><span class="meta">Incident: ${escapeHtml((a.incident_title || '').trim())}</span>` : ''}</p>`;
  };

  let locHtml = '';
  for (const loc of sortedLocs) {
    const { incidents: incArr, openActions, doneActions } = byLoc.get(loc);
    if (!incArr.length && !openActions.length && !doneActions.length) continue;

    const openInc = incArr.filter((i) => String(i.status || '').toLowerCase() !== 'closed');
    const closedToday = incArr.filter(
      (i) =>
        String(i.status || '').toLowerCase() === 'closed' && boolish(i.closed_this_day)
    );

    let inner = '';

    if (openInc.length) {
      inner += `<div class="sub">Incidenten nog open</div>${openInc.map(incidentBlock).join('')}`;
    }

    if (closedToday.length) {
      inner += `<div class="sub">Afgerond op rapportdatum / meegenomen dossier</div>${closedToday
        .map(incidentBlock)
        .join('')}`;
    }

    if (openActions.length) {
      inner += `<div class="sub">Openstaande acties</div>${openActions.map(actionBlock).join('')}`;
    }
    if (doneActions.length) {
      inner += `<div class="sub">Vandaag afgeronde acties (of gemarkeerd voltooid op deze datum)</div>${doneActions
        .map(actionBlock)
        .join('')}`;
    }

    locHtml += `<section class="loc-block"><p class="loc-head">${escapeHtml(loc)}:</p>${inner || '<p class="muted tiny">Geen inhoud onder deze kop.</p>'}</section>`;
  }

  if (!locHtml) {
    locHtml =
      '<p class="muted">Geen incidenten of acties waarbij deze datum voorkomt als aanmaak‑ of mutatiedatum.</p>';
  }

  /** Opvolgdienst — alles nog open uit dit dossier‑overzicht */
  const openIncGlob = incidents.filter((i) => String(i.status || '').toLowerCase() !== 'closed');
  const openActGlob = actions.filter((a) => String(a.status || '').toLowerCase() !== 'completed');

  let followHtml = '';
  if (openIncGlob.length === 0 && openActGlob.length === 0) {
    followHtml =
      '<p class="muted tiny">Geen openstaande incidenten of niet‑voltooide acties in bovenstaand overzicht.</p>';
  } else {
    if (openIncGlob.length) {
      followHtml += `<div class="sub">Openstaande incidenten (prioriteit voor vervolg)</div><ul>${openIncGlob
        .map(
          (i) =>
            `<li><strong>#${i.id}</strong> ${escapeHtml((i.title || '').trim())} — ${escapeHtml(
              locKeyFromIncident(i)
            )}, ${escapeHtml(String(i.priority || '').trim())}, ${incStatusNl(i.status)}</li>`
        )
        .join('')}</ul>`;
    }
    if (openActGlob.length) {
      followHtml += `<div class="sub">Openstaande acties</div><ul>${openActGlob
        .map(
          (a) =>
            `<li>${truncate(a.action_description, 200)} <span class="meta">(#${escapeHtml(String(a.incident_id || '?'))}, ${escapeHtml(
              locKeyFromAction(a)
            )})</span></li>`
        )
        .join('')}</ul>`;
    }
  }

  const statLine =
    `Nieuwe incidenten (alleen‑vandaag aangemaakt): ${stats.incidents_created ?? 0} · Gesloten vandaag: ${stats.incidents_closed ?? 0} · ` +
    `Acties nieuw vandaag: ${stats.actions_created ?? 0} · Afgeronde acties vandaag: ${stats.actions_completed ?? 0}`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8"/>
  <title>Dagrapportage SAC — ${formatDateNl()}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.42; padding: 0 6mm 8mm; }
    .doc-title { font-size: 13pt; font-weight: 700; text-align: center; margin: 8px 0 14px; }
    .kv { border-collapse: collapse; width: 100%; font-size: 10pt; margin-bottom: 16px; page-break-inside: avoid; }
    .kv td { padding: 4px 8px 4px 0; vertical-align: top; border-bottom: 1px solid #ddd; }
    .kv td:first-child { width: 7.8em; font-weight: 600; color: #333; white-space: nowrap; }
    h2.section { font-size: 10.5pt; font-weight: 700; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #222; padding-bottom: 3px; }
    .loc-block { margin: 14px 0; page-break-inside: avoid; }
    .loc-head { font-weight: 700; font-size: 11pt; margin: 0 0 6px; }
    .sub { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #444; margin: 10px 0 4px; }
    .entry { margin: 0 0 8px 2px; padding-left: 10px; border-left: 2px solid #ccc; font-size: 10.5pt; }
    .entry.act { border-left-color: #7c8db0; }
    .chip { font-size: 8.5pt; font-weight: 600; color: #374151; margin-left: 4px; }
    .meta { font-size: 9.5pt; color: #4b5563; }
    .body { font-size: 10.5pt; color: #111; }
    .muted { color: #6b7280; font-style: italic; font-size: 10pt; }
    .muted.tiny { font-size: 9pt; }
    .bij-line { padding: 5px 0 5px 12px; border-left: 2px solid #9ca3af; margin-bottom: 6px; font-size: 10.5pt; }
    ul { margin: 4px 0 12px 18px; padding: 0; }
    ul li { margin-bottom: 4px; font-size: 10.5pt; }
    footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 9pt; color: #6b7280; text-align: center; page-break-before: avoid; }
  </style>
</head>
<body>
  <p class="doc-title">Dagrapportage, Security Assets Coördinator · ${escapeHtml(formatDateShortNl())}</p>
  <table class="kv" role="presentation">
    <tr><td>SAC / registratie</td><td>${sacLineHtml}</td></tr>
    <tr><td>Datum rapport</td><td>${escapeHtml(formatDmY())}</td></tr>
    <tr><td>Start dienst</td><td>—</td></tr>
    <tr><td>Einde dienst</td><td>—</td></tr>
  </table>

  <h2 class="section">Bijzonderheden</h2>
  ${bijLines.length ? bijLines.join('') : '<p class="muted">Geen door het systeem gemarkeerde bijzonderheden (KPI) in het geselecteerde dossier.</p>'}

  <h2 class="section">Algemeen (samenvatting)</h2>
  <p class="muted tiny">${escapeHtml(statLine)}</p>

  <h2 class="section">Per locatie</h2>
  ${locHtml}

  <h2 class="section">Opvolging / aandachtspunten</h2>
  ${followHtml}

  <footer>CAS Service Portal · gegenereerd ${escapeHtml(formatGen())}</footer>
</body>
</html>`;
};

// Get available report dates (dates with incidents or actions)
const getAvailableReportDates = async (req, res) => {
  try {
    const client = await pool.connect();
    
    const query = `
      WITH days AS (
        SELECT DATE(created_at) AS d FROM Incidents
        UNION
        SELECT DATE(updated_at) FROM Incidents WHERE status = 'Closed'
        UNION
        SELECT DATE(created_at) FROM Actions
        UNION
        SELECT DATE(updated_at) FROM Actions WHERE updated_at IS DISTINCT FROM created_at
      )
      SELECT DISTINCT d AS report_date FROM days WHERE d IS NOT NULL
      ORDER BY report_date DESC
      LIMIT 30
    `;
    
    const result = await client.query(query);
    client.release();
    
    // DATE columns are strings (see config/db.js types.setTypeParser for OID 1082)
    res.json({
      dates: result.rows
        .map((row) => {
          const v = row.report_date;
          if (v == null) return null;
          if (typeof v === 'string') return v;
          if (v instanceof Date) return v.toISOString().split('T')[0];
          return String(v).slice(0, 10);
        })
        .filter(Boolean)
    });
  } catch (err) {
    console.error('Error fetching available report dates:', err);
    res.status(500).json({ message: 'Error fetching available report dates' });
  }
};

module.exports = {
  generateDailyReport,
  getAvailableReportDates
}; 