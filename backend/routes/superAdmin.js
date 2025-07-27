const express = require('express');
const router = express.Router();
const {
  loginSuperAdmin,
  getSuperAdminProfile,
  getAllTenants,
  getTenantById,
  createNewTenant,
  updateTenant,
  uploadTenantLogo,
  deleteTenant,
  getDashboardStats
} = require('../controllers/superAdminController');

const { superAdminMiddleware } = require('../middleware/tenantMiddleware');
const { authMiddleware } = require('../middleware/authMiddleware');

// Authentication routes (no auth required)
router.post('/login', loginSuperAdmin);

// Protected routes (require super admin authentication)
router.get('/profile', authMiddleware, superAdminMiddleware, getSuperAdminProfile);
router.get('/dashboard/stats', authMiddleware, superAdminMiddleware, getDashboardStats);

// Tenant management routes
router.get('/tenants', authMiddleware, superAdminMiddleware, getAllTenants);
router.get('/tenants/:tenantId', authMiddleware, superAdminMiddleware, getTenantById);
router.post('/tenants', authMiddleware, superAdminMiddleware, createNewTenant);
router.put('/tenants/:tenantId', authMiddleware, superAdminMiddleware, updateTenant);
router.post('/tenants/:tenantId/logo', authMiddleware, superAdminMiddleware, uploadTenantLogo);
router.delete('/tenants/:tenantId', authMiddleware, superAdminMiddleware, deleteTenant);

module.exports = router; 