const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Basic authentication middleware (updated for multi-tenant)
const authMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Check if it's a super admin token
    if (decoded.isSuperAdmin) {
      req.user.isSuperAdmin = true;
    }
    
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

      // Skip role check if using new tenant middleware (user already validated)
      if (req.user.role) {
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({ message: 'Insufficient permissions.' });
        }
        return next();
      }

      // Fallback for legacy auth (should not be used with tenant middleware)
      return res.status(400).json({ message: 'Invalid authentication context. Use tenant middleware.' });
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ message: 'Server error during authorization.' });
    }
  };
};

// Specific role middlewares
const requireSecurity = requireRole(['Security Officer', 'Admin']);
const requireAdmin = requireRole(['Admin']);
const requireDashboardAccess = requireRole(['Security Officer', 'Admin', 'Dashboard Viewer']);

module.exports = { 
  authMiddleware, 
  requireRole, 
  requireSecurity, 
  requireAdmin, 
  requireDashboardAccess 
}; 