const { pool } = require('../config/db');

// Get pending actions (not assigned or assigned to current user)
const getPendingActions = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        a.*,
        i.title as incident_title,
        i.priority as incident_priority,
        i.status as incident_status,
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
      WHERE a.status IN ('Pending', 'In Progress')
      AND (a.assigned_to IS NULL OR a.assigned_to = $1)
      ORDER BY 
        CASE a.status 
          WHEN 'In Progress' THEN 1 
          WHEN 'Pending' THEN 2 
        END,
        CASE i.priority 
          WHEN 'High' THEN 1 
          WHEN 'Medium' THEN 2 
          WHEN 'Low' THEN 3 
        END,
        a.created_at DESC
    `, [req.user.userId]);
    
    client.release();
    res.json({ actions: result.rows });
  } catch (err) {
    console.error('Error fetching pending actions:', err);
    res.status(500).json({ message: 'Error fetching pending actions' });
  }
};

// Get all actions with filtering and pagination
const getActions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, assigned_to, incident_id, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // Build dynamic WHERE clause
    if (status) {
      whereConditions.push(`a.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (priority) {
      whereConditions.push(`i.priority = $${paramIndex}`);
      queryParams.push(priority);
      paramIndex++;
    }
    
    if (assigned_to) {
      if (assigned_to === 'unassigned') {
        whereConditions.push(`a.assigned_to IS NULL`);
      } else {
        whereConditions.push(`a.assigned_to = $${paramIndex}`);
        queryParams.push(assigned_to);
        paramIndex++;
      }
    }
    
    if (incident_id) {
      whereConditions.push(`a.incident_id = $${paramIndex}`);
      queryParams.push(incident_id);
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`DATE(a.created_at) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`DATE(a.created_at) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const client = await pool.connect();
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Actions a
      LEFT JOIN Incidents i ON a.incident_id = i.id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const totalActions = parseInt(countResult.rows[0].total);
    
    // Get paginated actions
    const actionsQuery = `
      SELECT 
        a.*,
        i.title as incident_title,
        i.priority as incident_priority,
        i.status as incident_status,
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
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const actionsResult = await client.query(actionsQuery, queryParams);
    
    client.release();
    
    res.json({ 
      actions: actionsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalActions,
        totalPages: Math.ceil(totalActions / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching actions:', err);
    res.status(500).json({ message: 'Error fetching actions' });
  }
};

// Get archived actions (completed actions)
const getArchivedActions = async (req, res) => {
  try {
    const { page = 1, limit = 20, priority, assigned_to, incident_id, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['a.status = \'Completed\''];
    let queryParams = [];
    let paramIndex = 1;
    
    // Build dynamic WHERE clause
    if (priority) {
      whereConditions.push(`i.priority = $${paramIndex}`);
      queryParams.push(priority);
      paramIndex++;
    }
    
    if (assigned_to) {
      whereConditions.push(`a.assigned_to = $${paramIndex}`);
      queryParams.push(assigned_to);
      paramIndex++;
    }
    
    if (incident_id) {
      whereConditions.push(`a.incident_id = $${paramIndex}`);
      queryParams.push(incident_id);
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`DATE(a.updated_at) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`DATE(a.updated_at) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const client = await pool.connect();
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Actions a
      LEFT JOIN Incidents i ON a.incident_id = i.id
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const totalActions = parseInt(countResult.rows[0].total);
    
    // Get paginated actions
    const actionsQuery = `
      SELECT 
        a.*,
        i.title as incident_title,
        i.priority as incident_priority,
        i.status as incident_status,
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
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const actionsResult = await client.query(actionsQuery, queryParams);
    
    client.release();
    
    res.json({ 
      actions: actionsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalActions,
        totalPages: Math.ceil(totalActions / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching archived actions:', err);
    res.status(500).json({ message: 'Error fetching archived actions' });
  }
};

// Create new action
const createAction = async (req, res) => {
  const { incident_id, action_description, assigned_to } = req.body;
  
  try {
    const client = await pool.connect();
    
    // Verify incident exists
    const incidentCheck = await client.query('SELECT id FROM Incidents WHERE id = $1', [incident_id]);
    if (incidentCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // Create action
    const result = await client.query(`
      INSERT INTO Actions (incident_id, action_description, status, assigned_to, created_by)
      VALUES ($1, $2, 'Pending', $3, $4)
      RETURNING *
    `, [incident_id, action_description, assigned_to || null, req.user.userId]);
    
    client.release();
    res.status(201).json({ 
      message: 'Action created successfully',
      action: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating action:', err);
    res.status(500).json({ message: 'Error creating action' });
  }
};

// Take action (assign to current user)
const takeAction = async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Check if action exists and is available to take
    const actionCheck = await client.query(`
      SELECT id, assigned_to, status 
      FROM Actions 
      WHERE id = $1
    `, [id]);
    
    if (actionCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Action not found' });
    }
    
    const action = actionCheck.rows[0];
    
    // Check if action is already assigned to someone else
    if (action.assigned_to && action.assigned_to !== req.user.userId) {
      client.release();
      return res.status(400).json({ message: 'Action is already assigned to another user' });
    }
    
    // Check if action is already completed
    if (action.status === 'Completed') {
      client.release();
      return res.status(400).json({ message: 'Action is already completed' });
    }
    
    // Assign action to current user and set status to In Progress
    const result = await client.query(`
      UPDATE Actions 
      SET assigned_to = $1, status = 'In Progress', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [req.user.userId, id]);
    
    client.release();
    res.json({ 
      message: 'Action taken successfully',
      action: result.rows[0]
    });
  } catch (err) {
    console.error('Error taking action:', err);
    res.status(500).json({ message: 'Error taking action' });
  }
};

// Release action (unassign from current user)
const releaseAction = async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Check if action exists and user has permission to release it
    const actionCheck = await client.query(`
      SELECT id, assigned_to, status, created_by
      FROM Actions 
      WHERE id = $1
    `, [id]);
    
    if (actionCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Action not found' });
    }
    
    const action = actionCheck.rows[0];
    
    // Check if action is assigned to current user or user is admin
    const userRole = req.user.role || 'SAC';
    const canRelease = action.assigned_to === req.user.userId || userRole === 'Admin';
    
    if (!canRelease) {
      client.release();
      return res.status(403).json({ message: 'Not authorized to release this action' });
    }
    
    // Check if action is already completed
    if (action.status === 'Completed') {
      client.release();
      return res.status(400).json({ message: 'Cannot release a completed action' });
    }
    
    // Release action (unassign and set back to Pending)
    const result = await client.query(`
      UPDATE Actions 
      SET assigned_to = NULL, status = 'Pending', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    client.release();
    res.json({ 
      message: 'Action released successfully',
      action: result.rows[0]
    });
  } catch (err) {
    console.error('Error releasing action:', err);
    res.status(500).json({ message: 'Error releasing action' });
  }
};

// Update action status (only by assigned user or admin)
const updateActionStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  try {
    const client = await pool.connect();
    
    // Check if action exists and user has permission
    const actionCheck = await client.query(`
      SELECT id, assigned_to, created_by, status as current_status
      FROM Actions 
      WHERE id = $1
    `, [id]);
    
    if (actionCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Action not found' });
    }
    
    const action = actionCheck.rows[0];
    
    // Check permissions: only assigned user, creator, or admin can update
    const userRole = req.user.role || 'SAC';
    const canUpdate = action.assigned_to === req.user.userId || 
                     action.created_by === req.user.userId || 
                     userRole === 'Admin';
    
    if (!canUpdate) {
      client.release();
      return res.status(403).json({ message: 'Not authorized to update this action' });
    }
    
    // Validate status transition
    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      client.release();
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Update action
    let updateQuery = `
      UPDATE Actions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    let queryParams = [status];
    let paramIndex = 2;
    
    if (notes) {
      updateQuery += `, action_description = CONCAT(action_description, '\n\n--- Update ---\n', $${paramIndex})`;
      queryParams.push(notes);
      paramIndex++;
    }
    
    updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
    queryParams.push(id);
    
    const result = await client.query(updateQuery, queryParams);
    
    client.release();
    res.json({ 
      message: 'Action updated successfully',
      action: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating action status:', err);
    res.status(500).json({ message: 'Error updating action status' });
  }
};

// Get action statistics
const getActionStats = async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get various statistics
    const pendingStats = await client.query(`
      SELECT COUNT(*) as count FROM Actions 
      WHERE status = 'Pending'
    `);
    
    const inProgressStats = await client.query(`
      SELECT COUNT(*) as count FROM Actions 
      WHERE status = 'In Progress'
    `);
    
    const completedTodayStats = await client.query(`
      SELECT COUNT(*) as count FROM Actions 
      WHERE status = 'Completed' AND DATE(updated_at) = CURRENT_DATE
    `);
    
    const myActionsStats = await client.query(`
      SELECT COUNT(*) as count FROM Actions 
      WHERE assigned_to = $1 AND status IN ('Pending', 'In Progress')
    `, [req.user.userId]);
    
    client.release();
    
    res.json({
      pendingActions: parseInt(pendingStats.rows[0].count),
      inProgressActions: parseInt(inProgressStats.rows[0].count),
      completedToday: parseInt(completedTodayStats.rows[0].count),
      myActions: parseInt(myActionsStats.rows[0].count)
    });
  } catch (err) {
    console.error('Error fetching action stats:', err);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
};

// Get available users for assignment
const getAvailableUsers = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT u.id, u.username, u.email, r.name as role_name
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      WHERE r.name IN ('SAC', 'Admin')
      ORDER BY u.username ASC
    `);
    
    client.release();
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error fetching available users:', err);
    res.status(500).json({ message: 'Error fetching available users' });
  }
};

module.exports = {
  getPendingActions,
  getActions,
  getArchivedActions,
  createAction,
  takeAction,
  releaseAction,
  updateActionStatus,
  getActionStats,
  getAvailableUsers
}; 