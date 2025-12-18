const { pool } = require('../config/db');
const puppeteer = require('puppeteer');

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

    // Get incidents for the specified date
    const incidentsQuery = `
      SELECT 
        i.*,
        c.name as category_name,
        l.name as location_name,
        creator.username as created_by_name
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      LEFT JOIN Users creator ON i.created_by = creator.id
      WHERE DATE(i.created_at) = $1
      ORDER BY i.created_at DESC
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
      WHERE DATE(a.created_at) = $1 OR DATE(a.updated_at) = $1
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
    const stats = statsResult.rows[0];

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        c.name as category_name,
        COUNT(i.id) as incident_count
      FROM Categories c
      LEFT JOIN Incidents i ON c.id = i.category_id AND DATE(i.created_at) = $1
      GROUP BY c.id, c.name
      ORDER BY incident_count DESC
    `;
    
    const categoryResult = await client.query(categoryQuery, [date]);
    const categoryBreakdown = categoryResult.rows;

    // Get location breakdown
    const locationQuery = `
      SELECT 
        l.name as location_name,
        COUNT(i.id) as incident_count
      FROM Locations l
      LEFT JOIN Incidents i ON l.id = i.location_id AND DATE(i.created_at) = $1
      GROUP BY l.id, l.name
      ORDER BY incident_count DESC
    `;
    
    const locationResult = await client.query(locationQuery, [date]);
    const locationBreakdown = locationResult.rows;

    client.release();

    // Generate HTML for PDF
    const htmlContent = generateReportHTML({
      date,
      incidents,
      actions,
      stats,
      categoryBreakdown,
      locationBreakdown
    });

    // Generate PDF using Puppeteer with retry mechanism
    let browser;
    let page;
    let pdfBuffer;
    const maxRetries = 1; // Reduce retries to fail faster
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Starting PDF generation (attempt ${attempt}/${maxRetries})...`);
        
        // Use minimal, stable configuration
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ],
          timeout: 30000
        });
        
        console.log('Browser launched successfully');
        
        page = await browser.newPage();
        
        // Disable JavaScript to prevent crashes
        await page.setJavaScriptEnabled(false);
        
        // Set viewport
        await page.setViewport({
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1
        });
        
        console.log('Setting HTML content (length:', htmlContent.length, ')...');
        
        // Set content with simple wait condition
        await page.setContent(htmlContent, {
          waitUntil: 'load',
          timeout: 30000
        });
        
        console.log('Content loaded, waiting for rendering...');
        
        // Short wait for rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Generating PDF...');
        
        // Generate PDF with timeout
        pdfBuffer = await Promise.race([
          page.pdf({
            format: 'A4',
            printBackground: true,
            landscape: true,
            margin: {
              top: '10mm',
              right: '10mm',
              bottom: '10mm',
              left: '10mm'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PDF generation timeout after 30 seconds')), 30000)
          )
        ]);
        
        console.log('PDF generated successfully, size:', pdfBuffer ? pdfBuffer.length : 0);
        
        // Success - break out of retry loop
        break;
        
      } catch (attemptError) {
        console.error(`Attempt ${attempt} failed:`, attemptError.message);
        
        // Clean up failed attempt quickly
        try {
          if (page) {
            try {
              if (!page.isClosed()) {
                await Promise.race([
                  page.close(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                ]).catch(() => {});
              }
            } catch (e) {
              // Ignore
            }
            page = null;
          }
        } catch (e) {
          // Ignore
        }
        
        try {
          if (browser) {
            await Promise.race([
              browser.close(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]).catch(() => {});
            browser = null;
          }
        } catch (e) {
          // Ignore
        }
        
        // If last attempt, throw error
        if (attempt === maxRetries) {
          throw new Error(`PDF generation failed after ${maxRetries} attempts: ${attemptError.message}`);
        }
        
        // No retry wait needed if maxRetries is 1
        if (attempt < maxRetries) {
          console.log(`Waiting 1 second before retry (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF buffer after all attempts');
    }
    
    console.log('PDF generated successfully, size:', pdfBuffer.length);
    
    // Clean up before sending response
    try {
      if (page && !page.isClosed()) {
        await page.close().catch(() => {});
      }
    } catch (e) {
      console.error('Error closing page:', e);
    }
    
    try {
      if (browser) {
        await browser.close();
      }
    } catch (e) {
      console.error('Error closing browser:', e);
    }
    
    // Set response headers for PDF download
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

// Generate HTML content for the PDF report
const generateReportHTML = ({ date, incidents, actions, stats, categoryBreakdown, locationBreakdown }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#dc2626';
      case 'medium': return '#ea580c';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#2563eb';
      case 'in progress': return '#ca8a04';
      case 'closed': return '#16a34a';
      case 'pending': return '#ea580c';
      case 'completed': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CAS Dagrapport - ${formatDate(date)}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #fff;
        }
        
        .header {
          background: #1e40af;
          color: white;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.9;
        }
        
        .container {
          max-width: 100%;
          margin: 0 auto;
          padding: 0 10px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        
        .stat-number {
          font-size: 28px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 4px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        
        .section {
          margin-bottom: 32px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 3px solid #3b82f6;
        }
        
        /* Card-based layout for incidents and actions */
        .incidents-list, .actions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .incident-card, .action-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          page-break-inside: avoid;
          margin-bottom: 16px;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }
        
        .card-title-section {
          flex: 1;
          margin-right: 16px;
        }
        
        .card-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        
        .card-description {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
          margin-top: 8px;
        }
        
        .card-badges {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }
        
        .priority-badge, .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          white-space: nowrap;
          letter-spacing: 0.5px;
        }
        
        .card-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 16px;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
        }
        
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        
        .detail-value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
        }
        
        .card-time {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
          margin-bottom: 12px;
        }
        
        /* Legacy table styles for backwards compatibility */
        .table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: visible;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .breakdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .breakdown-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
        }
        
        .breakdown-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
        }
        
        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .breakdown-item:last-child {
          border-bottom: none;
        }
        
        .breakdown-count {
          font-weight: 600;
          color: #1e40af;
        }
        
        .footer {
          margin-top: 50px;
          padding: 20px;
          text-align: center;
          color: #64748b;
          font-size: 12px;
          border-top: 1px solid #e2e8f0;
        }
        
        .no-data {
          text-align: center;
          color: #64748b;
          font-style: italic;
          padding: 40px;
        }
        
        @media print {
          .section {
            page-break-inside: avoid;
          }
          
          .incident-card, .action-card {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .card-header {
            page-break-inside: avoid;
          }
        }
        
        /* Ensure all content is visible */
        body {
          overflow: visible;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CAS Service Portal</h1>
        <p>Dagrapport voor ${formatDate(date)}</p>
      </div>
      
      <div class="container">
        <!-- Statistics Overview -->
        <div class="section">
          <h2 class="section-title">📊 Dagstatistieken</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${stats.incidents_created || 0}</div>
              <div class="stat-label">Nieuwe Incidenten</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.incidents_closed || 0}</div>
              <div class="stat-label">Gesloten Incidenten</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.actions_created || 0}</div>
              <div class="stat-label">Nieuwe Acties</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.actions_completed || 0}</div>
              <div class="stat-label">Voltooide Acties</div>
            </div>
          </div>
        </div>

        <!-- Priority Breakdown -->
        <div class="section">
          <h2 class="section-title">🎯 Prioriteitsverdeling</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number" style="color: #dc2626;">${stats.high_priority_incidents || 0}</div>
              <div class="stat-label">Hoge Prioriteit</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" style="color: #ea580c;">${stats.medium_priority_incidents || 0}</div>
              <div class="stat-label">Gemiddelde Prioriteit</div>
            </div>
            <div class="stat-card">
              <div class="stat-number" style="color: #16a34a;">${stats.low_priority_incidents || 0}</div>
              <div class="stat-label">Lage Prioriteit</div>
            </div>
          </div>
        </div>

        <!-- Category and Location Breakdown -->
        <div class="breakdown-grid">
          <div class="breakdown-card">
            <h3 class="breakdown-title">📁 Verdeling per Categorie</h3>
            ${categoryBreakdown.filter(cat => cat.incident_count > 0).length > 0 ? 
              categoryBreakdown.filter(cat => cat.incident_count > 0).map(cat => `
                <div class="breakdown-item">
                  <span>${cat.category_name}</span>
                  <span class="breakdown-count">${cat.incident_count}</span>
                </div>
              `).join('') : 
              '<div class="no-data">Geen incidenten vandaag</div>'
            }
          </div>
          
          <div class="breakdown-card">
            <h3 class="breakdown-title">📍 Verdeling per Locatie</h3>
            ${locationBreakdown.filter(loc => loc.incident_count > 0).length > 0 ? 
              locationBreakdown.filter(loc => loc.incident_count > 0).map(loc => `
                <div class="breakdown-item">
                  <span>${loc.location_name}</span>
                  <span class="breakdown-count">${loc.incident_count}</span>
                </div>
              `).join('') : 
              '<div class="no-data">Geen incidenten vandaag</div>'
            }
          </div>
        </div>

        <!-- Incidents Section -->
        <div class="section">
          <h2 class="section-title">🚨 Incidenten van ${formatDate(date)}</h2>
          ${incidents.length > 0 ? `
            <div class="incidents-list">
              ${incidents.map(incident => `
                <div class="incident-card">
                  <div class="card-time">🕐 ${formatTime(incident.created_at)}</div>
                  <div class="card-header">
                    <div class="card-title-section">
                      <div class="card-title">${incident.title}</div>
                      ${incident.description ? `
                        <div class="card-description">${incident.description}</div>
                      ` : ''}
                    </div>
                    <div class="card-badges">
                      <span class="priority-badge" style="background-color: ${getPriorityColor(incident.priority)};">
                        ${incident.priority}
                      </span>
                      <span class="status-badge" style="background-color: ${getStatusColor(incident.status)};">
                        ${incident.status}
                      </span>
                    </div>
                  </div>
                  <div class="card-details">
                    <div class="detail-item">
                      <div class="detail-label">Categorie</div>
                      <div class="detail-value">${incident.category_name || '-'}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Locatie</div>
                      <div class="detail-value">${incident.location_name || '-'}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Aangemaakt door</div>
                      <div class="detail-value">${incident.created_by_name || '-'}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Datum & Tijd</div>
                      <div class="detail-value">${formatDateTime(incident.created_at)}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div class="no-data">Geen incidenten geregistreerd op deze dag</div>'}
        </div>

        <!-- Actions Section -->
        <div class="section">
          <h2 class="section-title">⚡ Acties van ${formatDate(date)}</h2>
          ${actions.length > 0 ? `
            <div class="actions-list">
              ${actions.map(action => `
                <div class="action-card">
                  <div class="card-time">🕐 ${formatTime(action.created_at)}</div>
                  <div class="card-header">
                    <div class="card-title-section">
                      <div class="card-title">${action.action_description || 'Geen beschrijving'}</div>
                      ${action.incident_title ? `
                        <div class="card-description">
                          <strong>Gerelateerd incident:</strong> ${action.incident_title}
                          ${action.incident_priority ? `
                            <span class="priority-badge" style="background-color: ${getPriorityColor(action.incident_priority)}; margin-left: 8px; font-size: 9px; padding: 3px 8px;">
                              ${action.incident_priority}
                            </span>
                          ` : ''}
                        </div>
                      ` : ''}
                    </div>
                    <div class="card-badges">
                      <span class="status-badge" style="background-color: ${getStatusColor(action.status)};">
                        ${action.status === 'Pending' ? 'Openstaand' : 
                          action.status === 'In Progress' ? 'In Behandeling' : 
                          action.status === 'Completed' ? 'Voltooid' : action.status}
                      </span>
                    </div>
                  </div>
                  <div class="card-details">
                    <div class="detail-item">
                      <div class="detail-label">Toegewezen aan</div>
                      <div class="detail-value">${action.assigned_to_name || 'Niet toegewezen'}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Aangemaakt door</div>
                      <div class="detail-value">${action.created_by_name || '-'}</div>
                    </div>
                    ${action.incident_title ? `
                      <div class="detail-item">
                        <div class="detail-label">Categorie</div>
                        <div class="detail-value">${action.category_name || '-'}</div>
                      </div>
                      <div class="detail-item">
                        <div class="detail-label">Locatie</div>
                        <div class="detail-value">${action.location_name || '-'}</div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div class="no-data">Geen acties geregistreerd op deze dag</div>'}
        </div>
      </div>

      <div class="footer">
        <p>Gegenereerd op ${formatDateTime(new Date().toISOString())} | CAS Service Portal</p>
      </div>
    </body>
    </html>
  `;
};

// Get available report dates (dates with incidents or actions)
const getAvailableReportDates = async (req, res) => {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT DISTINCT DATE(created_at) as report_date
      FROM (
        SELECT created_at FROM Incidents
        UNION
        SELECT created_at FROM Actions
        UNION
        SELECT updated_at as created_at FROM Actions WHERE updated_at != created_at
      ) combined_dates
      ORDER BY report_date DESC
      LIMIT 30
    `;
    
    const result = await client.query(query);
    client.release();
    
    res.json({ 
      dates: result.rows.map(row => row.report_date.toISOString().split('T')[0])
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