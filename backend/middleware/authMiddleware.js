const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Basic authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      const client = await pool.connect();
      const result = await client.query(
        `SELECT u.*, r.name as role_name 
         FROM Users u 
         JOIN Roles r ON u.role_id = r.id 
         WHERE u.id = $1`, 
        [req.user.userId]
      );
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const user = result.rows[0];
      const userRole = user.role_name;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}` 
        });
      }

      req.user.role = userRole;
      req.user.userData = user;
      next();
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ message: 'Server error during authorization.' });
    }
  };
};

// Specific role middlewares
const requireSAC = requireRole(['SAC', 'Admin']);
const requireAdmin = requireRole(['Admin']);
const requireDashboardAccess = requireRole(['SAC', 'Admin', 'Dashboard Viewer']);

module.exports = { 
  authMiddleware, 
  requireRole, 
  requireSAC, 
  requireAdmin, 
  requireDashboardAccess 
}; 