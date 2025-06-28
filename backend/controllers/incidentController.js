const { pool } = require('../config/db');

// Get today's incidents
const getTodaysIncidents = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        i.*,
        c.name as category_name,
        l.name as location_name,
        u.username as created_by_name
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      LEFT JOIN Users u ON i.created_by = u.id
      WHERE DATE(i.created_at) = CURRENT_DATE
      ORDER BY i.created_at DESC
    `);
    client.release();
    
    res.json({ incidents: result.rows });
  } catch (err) {
    console.error('Error fetching today\'s incidents:', err);
    res.status(500).json({ message: 'Error fetching incidents' });
  }
};

// Get all incidents for SAC
const getIncidents = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        i.*,
        c.name as category_name,
        l.name as location_name,
        u.username as created_by_name
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      LEFT JOIN Users u ON i.created_by = u.id
      ORDER BY i.created_at DESC
      LIMIT 50
    `);
    client.release();
    
    res.json({ incidents: result.rows });
  } catch (err) {
    console.error('Error fetching incidents:', err);
    res.status(500).json({ message: 'Error fetching incidents' });
  }
};

// Get archived incidents (with pagination and filtering)
const getArchivedIncidents = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, category, location, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Build dynamic WHERE clause
    if (status) {
      whereConditions.push(`i.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (priority) {
      whereConditions.push(`i.priority = $${paramIndex}`);
      queryParams.push(priority);
      paramIndex++;
    }
    
    if (category) {
      whereConditions.push(`c.name = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }
    
    if (location) {
      whereConditions.push(`l.name = $${paramIndex}`);
      queryParams.push(location);
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`DATE(i.created_at) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`DATE(i.created_at) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const client = await pool.connect();
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      LEFT JOIN Users u ON i.created_by = u.id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const totalIncidents = parseInt(countResult.rows[0].total);
    
    // Get paginated incidents
    const incidentsQuery = `
      SELECT 
        i.*,
        c.name as category_name,
        l.name as location_name,
        u.username as created_by_name
      FROM Incidents i
      LEFT JOIN Categories c ON i.category_id = c.id
      LEFT JOIN Locations l ON i.location_id = l.id
      LEFT JOIN Users u ON i.created_by = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const incidentsResult = await client.query(incidentsQuery, queryParams);
    
    client.release();
    
    res.json({ 
      incidents: incidentsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalIncidents,
        totalPages: Math.ceil(totalIncidents / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching archived incidents:', err);
    res.status(500).json({ message: 'Error fetching archived incidents' });
  }
};

// Create new incident
const createIncident = async (req, res) => {
  const { 
    title, description, priority, category_id, location_id, possible_solution,
    // SAC KPI tracking fields
    was_unregistered_incident, requires_escalation, escalation_reason,
    incorrect_diagnosis, incorrect_service_party, self_resolved_by_sac,
    self_resolution_description, estimated_downtime_minutes, actual_response_time_minutes,
    service_party_arrived_late, multiple_service_parties_needed
  } = req.body;
  
  let client;
  try {
    client = await pool.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Create incident with KPI tracking fields
    const incidentResult = await client.query(`
      INSERT INTO Incidents (
        title, description, status, priority, possible_solution, category_id, location_id, created_by,
        was_unregistered_incident, requires_escalation, escalation_reason,
        incorrect_diagnosis, incorrect_service_party, self_resolved_by_sac,
        self_resolution_description, estimated_downtime_minutes, actual_response_time_minutes,
        service_party_arrived_late, multiple_service_parties_needed
      )
      VALUES ($1, $2, 'Open', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      title, description, priority, possible_solution, category_id, location_id, req.user.userId,
      // Convert string 'true'/'false' to boolean
      was_unregistered_incident === 'true',
      requires_escalation === 'true',
      escalation_reason || null,
      incorrect_diagnosis === 'true',
      incorrect_service_party === 'true',
      self_resolved_by_sac === 'true',
      self_resolution_description || null,
      estimated_downtime_minutes ? parseInt(estimated_downtime_minutes) : null,
      actual_response_time_minutes ? parseInt(actual_response_time_minutes) : null,
      service_party_arrived_late === 'true',
      multiple_service_parties_needed === 'true'
    ]);
    
    const incident = incidentResult.rows[0];
    
    // Handle file attachments if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(`
          INSERT INTO IncidentAttachments (incident_id, file_path, original_name, file_size, mime_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          incident.id,
          file.path,
          file.originalname,
          file.size,
          file.mimetype
        ]);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    client.release();
    
    res.status(201).json({ 
      message: 'Incident created successfully',
      incident: incident,
      attachments: req.files ? req.files.length : 0
    });
  } catch (err) {
    console.error('Error creating incident:', err);
    
    // Rollback transaction on error
    try {
      if (client) {
        await client.query('ROLLBACK');
        client.release();
      }
    } catch (rollbackErr) {
      console.error('Error rolling back transaction:', rollbackErr);
    }
    
    res.status(500).json({ message: 'Error creating incident' });
  }
};

// Get incident statistics with SAC-specific KPIs
const getIncidentStats = async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Basic incident statistics
    const basicStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_incidents,
        COUNT(*) FILTER (WHERE status = 'Open') as open_incidents,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_incidents,
        COUNT(*) FILTER (WHERE status = 'Closed' AND DATE(updated_at) = CURRENT_DATE) as resolved_today,
        COUNT(*) as total_incidents
      FROM Incidents
    `;
    const basicStats = await client.query(basicStatsQuery);
    const stats = basicStats.rows[0];
    
    // SAC KPI 7: Niet geregistreerde incidenten - nu uit echte data
    const kpiQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE was_unregistered_incident = true) as unregistered_incidents,
        COUNT(*) FILTER (WHERE requires_escalation = true) as escalation_incidents,
        COUNT(*) FILTER (WHERE incorrect_diagnosis = true) as incorrect_diagnosis_incidents,
        COUNT(*) FILTER (WHERE incorrect_service_party = true) as incorrect_service_party_incidents,
        COUNT(*) FILTER (WHERE self_resolved_by_sac = true) as sac_resolved_incidents,
        COUNT(*) FILTER (WHERE service_party_arrived_late = true) as late_service_party_incidents,
        COUNT(*) FILTER (WHERE multiple_service_parties_needed = true) as multiple_service_parties_incidents,
        AVG(estimated_downtime_minutes) FILTER (WHERE estimated_downtime_minutes IS NOT NULL) as avg_estimated_downtime,
        AVG(actual_response_time_minutes) FILTER (WHERE actual_response_time_minutes IS NOT NULL) as avg_response_time
      FROM Incidents
    `;
    const kpiStats = await client.query(kpiQuery);
    const kpi = kpiStats.rows[0];
    
    const totalIncidents = parseInt(stats.total_incidents) || 0;
    const unregisteredIncidents = parseInt(kpi.unregistered_incidents) || 0;
    const incidentDetectionRate = totalIncidents > 0 ? ((totalIncidents - unregisteredIncidents) / totalIncidents) * 100 : 100;
    
    // SAC KPI 8: Incidenten binnen oplostijd
    // Simuleren we SLA van 4 uur voor hoge prioriteit, 8 uur voor medium, 24 uur voor low
    const slaQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE 
          status = 'Closed' AND 
          (
            (priority = 'High' AND updated_at <= created_at + INTERVAL '4 hours') OR
            (priority = 'Medium' AND updated_at <= created_at + INTERVAL '8 hours') OR
            (priority = 'Low' AND updated_at <= created_at + INTERVAL '24 hours')
          )
        ) as within_sla,
        COUNT(*) FILTER (WHERE 
          status = 'Closed' AND 
          (
            (priority = 'High' AND updated_at > created_at + INTERVAL '4 hours') OR
            (priority = 'Medium' AND updated_at > created_at + INTERVAL '8 hours') OR
            (priority = 'Low' AND updated_at > created_at + INTERVAL '24 hours')
          )
        ) as beyond_sla,
        COUNT(*) FILTER (WHERE status = 'Closed') as total_closed
      FROM Incidents
    `;
    const slaStats = await client.query(slaQuery);
    const sla = slaStats.rows[0];
    
    const incidentsWithinSLA = parseInt(sla.within_sla) || 0;
    const incidentsBeyondSLA = parseInt(sla.beyond_sla) || 0;
    const totalClosed = parseInt(sla.total_closed) || 0;
    const slaComplianceRate = totalClosed > 0 ? (incidentsWithinSLA / totalClosed) * 100 : 100;
    
    // SAC KPI 9: Security Lane Uptime (placeholder - zou uit operationele systemen moeten komen)
    // Simuleren we 24 security lanes met variabele uptime
    const totalSecurityLanes = 24;
    const currentHour = new Date().getHours();
    // Simuleer lagere uptime tijdens piekuren (6-10 en 16-20)
    const isPeakHour = (currentHour >= 6 && currentHour <= 10) || (currentHour >= 16 && currentHour <= 20);
    const baseUptime = isPeakHour ? 0.85 : 0.95; // 85% tijdens piek, 95% normaal
    const operationalLanes = Math.floor(totalSecurityLanes * (baseUptime + Math.random() * 0.1));
    const downtimeLanes = totalSecurityLanes - operationalLanes;
    const uptimePercentage = (operationalLanes / totalSecurityLanes) * 100;
    
    // SAC KPI 10: Escalatie/Nabellen - nu uit echte SAC data
    const incidentsRequiringEscalation = parseInt(kpi.escalation_incidents) || 0;
    const openIncidents = parseInt(stats.open_incidents) + parseInt(stats.in_progress_incidents);
    const escalationRate = openIncidents > 0 ? (incidentsRequiringEscalation / openIncidents) * 100 : 0;
    
    // Service Party Performance - nu uit echte SAC data
    const incorrectDiagnosis = parseInt(kpi.incorrect_diagnosis_incidents) || 0;
    const incorrectServiceParty = parseInt(kpi.incorrect_service_party_incidents) || 0;
    const lateServiceParty = parseInt(kpi.late_service_party_incidents) || 0;
    const multipleServiceParties = parseInt(kpi.multiple_service_parties_incidents) || 0;
    
    // Bereken correcte diagnose rate (omgekeerd van incorrect)
    const correctDiagnoseRate = totalIncidents > 0 ? ((totalIncidents - incorrectDiagnosis) / totalIncidents) * 100 : 100;
    
    // Gebruik echte response tijd data
    const avgServicePartyResponseTime = parseFloat(kpi.avg_response_time) || 0;
    
    // Service party KPI compliance (gebaseerd op late arrivals)
    const servicePartyKpiCompliance = totalIncidents > 0 ? ((totalIncidents - lateServiceParty) / totalIncidents) * 100 : 100;
    
    // Asset Performance - gebruik echte downtime data waar beschikbaar
    const criticalAssetDowntime = parseFloat(kpi.avg_estimated_downtime) || 0;
    const avgAssetRepairTime = avgServicePartyResponseTime; // Use same as response time for now
    
    // SAC Resolution Performance
    const sacResolvedIncidents = parseInt(kpi.sac_resolved_incidents) || 0;
    const sacResolutionRate = totalIncidents > 0 ? (sacResolvedIncidents / totalIncidents) * 100 : 0;
    
    client.release();
    
    res.json({
      // Basic stats
      todayIncidents: parseInt(stats.today_incidents) || 0,
      openIncidents: parseInt(stats.open_incidents) || 0,
      inProgressIncidents: parseInt(stats.in_progress_incidents) || 0,
      resolvedToday: parseInt(stats.resolved_today) || 0,
      
      // SAC KPI 7: Incident Detection
      unregisteredIncidents,
      incidentDetectionRate: parseFloat(incidentDetectionRate.toFixed(1)),
      
      // SAC KPI 8: SLA Compliance
      incidentsWithinSLA,
      incidentsBeyondSLA,
      slaComplianceRate: parseFloat(slaComplianceRate.toFixed(1)),
      
      // SAC KPI 9: Security Lane Uptime
      totalSecurityLanes,
      operationalLanes,
      downtimeLanes,
      uptimePercentage: parseFloat(uptimePercentage.toFixed(1)),
      
      // SAC KPI 10: Escalation
      incidentsRequiringEscalation,
      escalationRate: parseFloat(escalationRate.toFixed(1)),
      
      // Service Party Performance
      correctDiagnoseRate: parseFloat(correctDiagnoseRate.toFixed(1)),
      avgServicePartyResponseTime: parseFloat(avgServicePartyResponseTime.toFixed(1)),
      servicePartyKpiCompliance: parseFloat(servicePartyKpiCompliance.toFixed(1)),
      
      // Asset Performance
      criticalAssetDowntime: parseFloat(criticalAssetDowntime.toFixed(1)),
      avgAssetRepairTime: parseFloat(avgAssetRepairTime.toFixed(1)),
      
      // Additional SAC KPI Metrics
      incorrectDiagnosis,
      incorrectServiceParty,
      lateServiceParty,
      multipleServiceParties,
      sacResolvedIncidents,
      sacResolutionRate: parseFloat(sacResolutionRate.toFixed(1))
    });
  } catch (err) {
    console.error('Error fetching incident stats:', err);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
};

// Get incident attachments
const getIncidentAttachments = async (req, res) => {
  const { incidentId } = req.params;
  
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, original_name, file_size, mime_type, uploaded_at
      FROM IncidentAttachments
      WHERE incident_id = $1
      ORDER BY uploaded_at DESC
    `, [incidentId]);
    
    client.release();
    res.json({ attachments: result.rows });
  } catch (err) {
    console.error('Error fetching incident attachments:', err);
    res.status(500).json({ message: 'Error fetching attachments' });
  }
};

// Download/serve attachment file
const downloadAttachment = async (req, res) => {
  const { attachmentId } = req.params;
  
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT file_path, original_name, mime_type
      FROM IncidentAttachments
      WHERE id = $1
    `, [attachmentId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    const attachment = result.rows[0];
    const fs = require('fs');
    const path = require('path');
    
    // Check if file exists
    if (!fs.existsSync(attachment.file_path)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the file
    const fileStream = fs.createReadStream(attachment.file_path);
    fileStream.pipe(res);
    
  } catch (err) {
    console.error('Error downloading attachment:', err);
    res.status(500).json({ message: 'Error downloading attachment' });
  }
};

// Update incident
const updateIncident = async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority, category_id, location_id, possible_solution } = req.body;
  
  try {
    const client = await pool.connect();
    
    // Check if incident exists and user has permission to edit
    const checkResult = await client.query(`
      SELECT id FROM Incidents 
      WHERE id = $1 AND (created_by = $2 OR $3 = 'Admin')
    `, [id, req.user.userId, req.user.role || 'SAC']);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Incident not found or access denied' });
    }
    
    // Update incident
    const result = await client.query(`
      UPDATE Incidents 
      SET title = $1, description = $2, status = $3, priority = $4, 
          category_id = $5, location_id = $6, possible_solution = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [title, description, status, priority, category_id, location_id, possible_solution, id]);
    
    client.release();
    res.json({ 
      message: 'Incident updated successfully',
      incident: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating incident:', err);
    res.status(500).json({ message: 'Error updating incident' });
  }
};

module.exports = {
  getTodaysIncidents,
  getIncidents,
  getArchivedIncidents,
  createIncident,
  updateIncident,
  getIncidentStats,
  getIncidentAttachments,
  downloadAttachment
}; 