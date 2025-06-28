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

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();

    // Set response headers for PDF download
    const filename = `CAS_Dagrapport_${date.replace(/-/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generating daily report:', err);
    res.status(500).json({ message: 'Error generating daily report' });
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
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 30px;
          text-align: center;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .header p {
          font-size: 18px;
          opacity: 0.9;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        
        .stat-number {
          font-size: 32px;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        
        .section {
          margin-bottom: 40px;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .table th {
          background: #f1f5f9;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }
        
        .table tr:last-child td {
          border-bottom: none;
        }
        
        .priority-badge, .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          text-transform: uppercase;
        }
        
        .description {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .breakdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .breakdown-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        
        .breakdown-title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 15px;
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
          
          .table {
            page-break-inside: auto;
          }
          
          .table tr {
            page-break-inside: avoid;
          }
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
            <table class="table">
              <thead>
                <tr>
                  <th>Tijd</th>
                  <th>Titel</th>
                  <th>Prioriteit</th>
                  <th>Status</th>
                  <th>Categorie</th>
                  <th>Locatie</th>
                  <th>Aangemaakt door</th>
                </tr>
              </thead>
              <tbody>
                ${incidents.map(incident => `
                  <tr>
                    <td>${formatTime(incident.created_at)}</td>
                    <td>
                      <strong>${incident.title}</strong>
                      <div class="description" style="font-size: 12px; color: #64748b; margin-top: 4px;">
                        ${incident.description}
                      </div>
                    </td>
                    <td>
                      <span class="priority-badge" style="background-color: ${getPriorityColor(incident.priority)};">
                        ${incident.priority}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge" style="background-color: ${getStatusColor(incident.status)};">
                        ${incident.status}
                      </span>
                    </td>
                    <td>${incident.category_name || '-'}</td>
                    <td>${incident.location_name || '-'}</td>
                    <td>${incident.created_by_name || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="no-data">Geen incidenten geregistreerd op deze dag</div>'}
        </div>

        <!-- Actions Section -->
        <div class="section">
          <h2 class="section-title">⚡ Acties van ${formatDate(date)}</h2>
          ${actions.length > 0 ? `
            <table class="table">
              <thead>
                <tr>
                  <th>Tijd</th>
                  <th>Incident</th>
                  <th>Actie Beschrijving</th>
                  <th>Status</th>
                  <th>Toegewezen aan</th>
                  <th>Aangemaakt door</th>
                </tr>
              </thead>
              <tbody>
                ${actions.map(action => `
                  <tr>
                    <td>${formatTime(action.created_at)}</td>
                    <td>
                      <strong>${action.incident_title}</strong>
                      <div style="font-size: 12px; color: #64748b;">
                        <span class="priority-badge" style="background-color: ${getPriorityColor(action.incident_priority)}; font-size: 10px;">
                          ${action.incident_priority}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="description">
                        ${action.action_description}
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" style="background-color: ${getStatusColor(action.status)};">
                        ${action.status === 'Pending' ? 'Openstaand' : 
                          action.status === 'In Progress' ? 'In Behandeling' : 'Voltooid'}
                      </span>
                    </td>
                    <td>${action.assigned_to_name || 'Niet toegewezen'}</td>
                    <td>${action.created_by_name || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
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