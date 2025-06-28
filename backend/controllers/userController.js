const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.created_at,
        u.updated_at,
        r.name as role_name,
        r.description as role_description
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    client.release();
    
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get all roles
const getRoles = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, name, description
      FROM Roles
      ORDER BY 
        CASE 
          WHEN name = 'Admin' THEN 1
          WHEN name = 'SAC' THEN 2
          WHEN name = 'Dashboard Viewer' THEN 3
          ELSE 4
        END
    `);
    client.release();
    
    res.json({ roles: result.rows });
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ message: 'Error fetching roles' });
  }
};

// Create new user
const createUser = async (req, res) => {
  const { username, email, password, role_id } = req.body;
  
  // Validation
  if (!username || !email || !password || !role_id) {
    return res.status(400).json({ message: 'Alle velden zijn verplicht' });
  }
  
  if (username.trim().length < 3) {
    return res.status(400).json({ message: 'Gebruikersnaam moet minimaal 3 karakters zijn' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ message: 'Wachtwoord moet minimaal 6 karakters zijn' });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Ongeldig email adres' });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if username already exists
    const existingUser = await client.query(
      'SELECT id FROM Users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username.trim(), email.trim()]
    );
    
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Gebruikersnaam of email bestaat al' });
    }
    
    // Check if role exists
    const roleCheck = await client.query('SELECT id FROM Roles WHERE id = $1', [role_id]);
    if (roleCheck.rows.length === 0) {
      client.release();
      return res.status(400).json({ message: 'Ongeldige rol' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, created_at
    `, [username.trim(), email.trim(), hashedPassword, role_id]);
    
    // Get user with role info
    const userWithRole = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.created_at,
        r.name as role_name,
        r.description as role_description
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [result.rows[0].id]);
    
    client.release();
    
    res.status(201).json({
      message: 'Gebruiker succesvol aangemaakt',
      user: userWithRole.rows[0]
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, role_id, password } = req.body;
  
  // Validation
  if (!username || !email || !role_id) {
    return res.status(400).json({ message: 'Gebruikersnaam, email en rol zijn verplicht' });
  }
  
  if (username.trim().length < 3) {
    return res.status(400).json({ message: 'Gebruikersnaam moet minimaal 3 karakters zijn' });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Ongeldig email adres' });
  }
  
  // Password validation (if provided)
  if (password && password.length < 6) {
    return res.status(400).json({ message: 'Wachtwoord moet minimaal 6 karakters zijn' });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if user exists
    const existingUser = await client.query('SELECT id, username FROM Users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Gebruiker niet gevonden' });
    }
    
    // Prevent user from demoting themselves from admin
    if (req.user.userId === parseInt(id) && req.user.role === 'Admin') {
      const roleCheck = await client.query('SELECT name FROM Roles WHERE id = $1', [role_id]);
      if (roleCheck.rows.length > 0 && roleCheck.rows[0].name !== 'Admin') {
        client.release();
        return res.status(400).json({ message: 'Je kunt je eigen admin rechten niet intrekken' });
      }
    }
    
    // Check if new username/email already exists (excluding current user)
    const duplicateCheck = await client.query(
      'SELECT id FROM Users WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)) AND id != $3',
      [username.trim(), email.trim(), id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Gebruikersnaam of email bestaat al' });
    }
    
    // Check if role exists
    const roleCheck = await client.query('SELECT id FROM Roles WHERE id = $1', [role_id]);
    if (roleCheck.rows.length === 0) {
      client.release();
      return res.status(400).json({ message: 'Ongeldige rol' });
    }
    
    let updateQuery;
    let queryParams;
    
    if (password) {
      // Update with new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery = `
        UPDATE Users 
        SET username = $1, email = $2, role_id = $3, password_hash = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, username, email, updated_at
      `;
      queryParams = [username.trim(), email.trim(), role_id, hashedPassword, id];
    } else {
      // Update without changing password
      updateQuery = `
        UPDATE Users 
        SET username = $1, email = $2, role_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, username, email, updated_at
      `;
      queryParams = [username.trim(), email.trim(), role_id, id];
    }
    
    await client.query(updateQuery, queryParams);
    
    // Get updated user with role info
    const userWithRole = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.created_at,
        u.updated_at,
        r.name as role_name,
        r.description as role_description
      FROM Users u
      JOIN Roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [id]);
    
    client.release();
    
    res.json({
      message: 'Gebruiker succesvol bijgewerkt',
      user: userWithRole.rows[0]
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Check if user exists
    const existingUser = await client.query('SELECT id, username FROM Users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Gebruiker niet gevonden' });
    }
    
    // Prevent user from deleting themselves
    if (req.user.userId === parseInt(id)) {
      client.release();
      return res.status(400).json({ message: 'Je kunt je eigen account niet verwijderen' });
    }
    
    // Check if user has created incidents or actions
    const usageCheck = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM Incidents WHERE created_by = $1) as incidents,
        (SELECT COUNT(*) FROM Actions WHERE created_by = $1 OR assigned_to = $1) as actions
    `, [id]);
    
    const { incidents, actions } = usageCheck.rows[0];
    const totalUsage = parseInt(incidents) + parseInt(actions);
    
    if (totalUsage > 0) {
      client.release();
      return res.status(400).json({ 
        message: `Gebruiker kan niet verwijderd worden. Heeft ${incidents} incident(en) en ${actions} actie(s) in het systeem.`
      });
    }
    
    await client.query('DELETE FROM Users WHERE id = $1', [id]);
    client.release();
    
    res.json({ message: 'Gebruiker succesvol verwijderd' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        r.name as role_name,
        COUNT(u.id) as user_count
      FROM Roles r
      LEFT JOIN Users u ON r.id = u.role_id
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    client.release();
    
    res.json({ stats: result.rows });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ message: 'Error fetching user stats' });
  }
};

module.exports = {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
}; 