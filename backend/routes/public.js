const express = require('express');
const router = express.Router();
const { 
  getPublicTenants, 
  clearTenantCache, 
  getTenantCacheStatus 
} = require('../controllers/publicController');
const {
  publicRateLimiter,
  validateTenantQuery,
  securityHeaders,
  publicErrorHandler,
  publicRequestLogger
} = require('../middleware/publicMiddleware');

// Apply security headers to all public routes
router.use(securityHeaders);

// Apply request logging to all public routes
router.use(publicRequestLogger);

// Apply rate limiting to all public routes
router.use(publicRateLimiter);

// Public routes (no authentication required)
router.get('/tenants', validateTenantQuery, getPublicTenants);

// Cache management routes (for admin use)
router.get('/cache/status', getTenantCacheStatus);
router.delete('/cache/clear', clearTenantCache);

// Health check endpoint for public access
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version endpoint
router.get('/version', (req, res) => {
  res.json({ 
    version: '1.0.0',
    api: 'CAS Service Portal API',
    timestamp: new Date().toISOString()
  });
});

// Apply error handling middleware
router.use(publicErrorHandler);

module.exports = router; 