const { pool } = require('../config/db');

// Get schedules for a specific user (SAC view)
const getUserSchedules = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;
    
    const client = await pool.connect();
    
    let query = `
      SELECT 
        s.*,
        u.username,
        u.email,
        approver.username as approved_by_name
      FROM Schedules s
      JOIN Users u ON s.user_id = u.id
      LEFT JOIN Users approver ON s.approved_by = approver.id
      WHERE s.user_id = $1
    `;
    
    const params = [userId];
    
    if (startDate && endDate) {
      query += ` AND s.date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    } else {
      // Default to current month — use local date components to avoid UTC timezone shift
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      const endStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      query += ` AND s.date BETWEEN $2 AND $3`;
      params.push(startStr, endStr);
    }
    
    query += ` ORDER BY s.date ASC, s.start_time ASC`;
    
    const result = await client.query(query, params);
    client.release();
    
    res.json({ schedules: result.rows });
  } catch (err) {
    console.error('Error fetching user schedules:', err);
    res.status(500).json({ message: 'Error fetching schedules' });
  }
};

// Get all schedules for admin view
const getAllSchedules = async (req, res) => {
  try {
    const { startDate, endDate, userId, status } = req.query;
    
    const client = await pool.connect();
    
    let query = `
      SELECT 
        s.*,
        u.username,
        u.email,
        u.role_id,
        r.name as role_name,
        approver.username as approved_by_name
      FROM Schedules s
      JOIN Users u ON s.user_id = u.id
      JOIN Roles r ON u.role_id = r.id
      LEFT JOIN Users approver ON s.approved_by = approver.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (startDate && endDate) {
      query += ` AND s.date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    } else {
      // Default to current month — use local date components to avoid UTC timezone shift
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
      const endStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      query += ` AND s.date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startStr, endStr);
      paramCount += 2;
    }
    
    if (userId) {
      query += ` AND s.user_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }
    
    if (status) {
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY s.date ASC, s.start_time ASC, u.username ASC`;
    
    const result = await client.query(query, params);
    client.release();
    
    res.json({ schedules: result.rows });
  } catch (err) {
    console.error('Error fetching all schedules:', err);
    res.status(500).json({ message: 'Error fetching schedules' });
  }
};

// Create availability request (SAC submits availability)
const createAvailability = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, startTime, endTime, notes } = req.body;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Date, start time, and end time are required' });
    }
    
    if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ message: 'Cannot create schedule for past dates' });
    }
    
    const client = await pool.connect();
    
    // Check for overlapping schedules
    const overlapCheck = await client.query(`
      SELECT id FROM Schedules 
      WHERE user_id = $1 
      AND date = $2 
      AND (
        (start_time < $3 AND end_time > $3) OR
        (start_time < $4 AND end_time > $4) OR
        (start_time >= $3 AND end_time <= $4)
      )
    `, [userId, date, startTime, endTime]);
    
    if (overlapCheck.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'Schedule overlaps with existing schedule' });
    }
    
    const result = await client.query(`
      INSERT INTO Schedules (user_id, date, start_time, end_time, status, notes, created_by)
      VALUES ($1, $2, $3, $4, 'pending', $5, $1)
      RETURNING *
    `, [userId, date, startTime, endTime, notes || null]);
    
    client.release();
    
    res.status(201).json({ 
      message: 'Availability request created successfully',
      schedule: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating availability:', err);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Schedule already exists for this time slot' });
    }
    res.status(500).json({ message: 'Error creating availability' });
  }
};

// Update schedule (SAC can update their own pending schedules)
const updateSchedule = async (req, res) => {
  try {
    const userId = req.user.userId;
    const scheduleId = req.params.id;
    const { date, startTime, endTime, notes } = req.body;
    
    const client = await pool.connect();
    
    // Check if schedule exists and belongs to user
    const scheduleCheck = await client.query(
      'SELECT * FROM Schedules WHERE id = $1 AND user_id = $2',
      [scheduleId, userId]
    );
    
    if (scheduleCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    const schedule = scheduleCheck.rows[0];
    
    // Only allow updates to pending schedules
    if (schedule.status !== 'pending') {
      client.release();
      return res.status(400).json({ message: 'Can only update pending schedules' });
    }
    
    // Check for overlapping schedules (excluding current one)
    if (date && startTime && endTime) {
      const overlapCheck = await client.query(`
        SELECT id FROM Schedules 
        WHERE user_id = $1 
        AND id != $2
        AND date = $3 
        AND (
          (start_time < $4 AND end_time > $4) OR
          (start_time < $5 AND end_time > $5) OR
          (start_time >= $4 AND end_time <= $5)
        )
      `, [userId, scheduleId, date, startTime, endTime]);
      
      if (overlapCheck.rows.length > 0) {
        client.release();
        return res.status(400).json({ message: 'Schedule overlaps with existing schedule' });
      }
    }
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (date) {
      updateFields.push(`date = $${paramCount++}`);
      updateValues.push(date);
    }
    if (startTime) {
      updateFields.push(`start_time = $${paramCount++}`);
      updateValues.push(startTime);
    }
    if (endTime) {
      updateFields.push(`end_time = $${paramCount++}`);
      updateValues.push(endTime);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      updateValues.push(notes);
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 1) {
      // Only updated_at, nothing to update
      client.release();
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Add scheduleId and userId to the values array
    updateValues.push(scheduleId, userId);
    
    const result = await client.query(`
      UPDATE Schedules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `, updateValues);
    
    client.release();
    
    res.json({ 
      message: 'Schedule updated successfully',
      schedule: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating schedule:', err);
    res.status(500).json({ message: 'Error updating schedule' });
  }
};

// Admin: Approve or reject schedule
const approveRejectSchedule = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const scheduleId = req.params.id;
    const { status, notes } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "approved" or "rejected"' });
    }
    
    const client = await pool.connect();
    
    // Check if schedule exists
    const scheduleCheck = await client.query(
      'SELECT * FROM Schedules WHERE id = $1',
      [scheduleId]
    );
    
    if (scheduleCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    const result = await client.query(`
      UPDATE Schedules 
      SET status = $1, 
          approved_by = $2,
          notes = COALESCE($3, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [status, adminId, notes || null, scheduleId]);
    
    client.release();
    
    res.json({ 
      message: `Schedule ${status} successfully`,
      schedule: result.rows[0]
    });
  } catch (err) {
    console.error('Error approving/rejecting schedule:', err);
    res.status(500).json({ message: 'Error updating schedule status' });
  }
};

// Delete schedule (SAC can delete their own pending schedules)
const deleteSchedule = async (req, res) => {
  try {
    const userId = req.user.userId;
    const scheduleId = req.params.id;
    
    const client = await pool.connect();
    
    // Check if schedule exists and belongs to user
    const scheduleCheck = await client.query(
      'SELECT * FROM Schedules WHERE id = $1 AND user_id = $2',
      [scheduleId, userId]
    );
    
    if (scheduleCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    const schedule = scheduleCheck.rows[0];
    
    // Only allow deletion of pending schedules
    if (schedule.status !== 'pending') {
      client.release();
      return res.status(400).json({ message: 'Can only delete pending schedules' });
    }
    
    await client.query('DELETE FROM Schedules WHERE id = $1', [scheduleId]);
    client.release();
    
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).json({ message: 'Error deleting schedule' });
  }
};

// Get all SAC users for admin dropdown
const getSACUsers = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT u.id, u.username, u.email
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      WHERE r.name = 'SAC'
      ORDER BY u.username ASC
    `);
    client.release();
    
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error fetching SAC users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

module.exports = {
  getUserSchedules,
  getAllSchedules,
  createAvailability,
  updateSchedule,
  approveRejectSchedule,
  deleteSchedule,
  getSACUsers
};

