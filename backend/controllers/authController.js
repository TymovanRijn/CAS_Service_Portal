const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const registerUser = async (req, res) => {
  const { username, email, password, role_id = 1 } = req.body; // Default to role_id 1 (SAC)
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    
    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM Users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    const result = await client.query(
      'INSERT INTO Users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id, username, email', 
      [username, email, hashedPassword, role_id]
    );
    
    client.release();
    res.status(201).json({ 
      message: 'User registered successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Error registering user' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT u.*, r.name as role_name, r.description as role_description 
       FROM Users u 
       JOIN Roles r ON u.role_id = r.id 
       WHERE u.email = $1`, 
      [email]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Don't send password hash in response
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({ 
      token,
      user: userWithoutPassword,
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error logging in' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      `SELECT u.id, u.username, u.email, u.created_at, u.updated_at,
              r.name as role_name, r.description as role_description 
       FROM Users u 
       JOIN Roles r ON u.role_id = r.id 
       WHERE u.id = $1`, 
      [req.user.userId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};

module.exports = { registerUser, loginUser, getUserProfile }; 