const express = require('express');
const router = express.Router();
const {
  registerTenantUser,
  loginTenantUser,
  getTenantUserProfile,
  getTenantUsers,
  updateTenantUser,
  deleteTenantUser,
  getTenantRoles,
  createTenantRole,
  updateTenantRole,
  deleteTenantRole,
  getAvailablePermissions
} = require('../controllers/tenantAuthController');

const { 
  tenantMiddleware, 
  tenantAuthAndValidationMiddleware,
  requireTenantPermission 
} = require('../middleware/tenantMiddleware');

// Public routes (require tenant context but no auth)
router.post('/login', tenantMiddleware, loginTenantUser);

// Protected routes (require full tenant authentication and validation)
router.get('/profile', tenantAuthAndValidationMiddleware, getTenantUserProfile);
router.get('/roles', tenantAuthAndValidationMiddleware, getTenantRoles);
router.get('/permissions', tenantAuthAndValidationMiddleware, getAvailablePermissions);

// Admin-only routes (require tenant admin or higher permissions)
router.post('/register', 
  tenantAuthAndValidationMiddleware, 
  requireTenantPermission(['all', 'users:create']), 
  registerTenantUser
);

router.get('/users', 
  tenantAuthAndValidationMiddleware, 
  requireTenantPermission(['all', 'users:read']), 
  getTenantUsers
);

router.put('/users/:userId', 
  tenantAuthAndValidationMiddleware, 
  requireTenantPermission(['all', 'users:update']), 
  updateTenantUser
);

router.delete('/users/:userId', 
  tenantAuthAndValidationMiddleware, 
  requireTenantPermission(['all', 'users:delete']), 
  deleteTenantUser
);

// Role management routes (admin only)
router.post('/roles', 
  tenantAuthAndValidationMiddleware, 
  requireTenantPermission(['all']), 
  createTenantRole
);

router.put('/roles/:roleId', 
  tenantAuthAndValidationMiddleware, 
  requireTenantPermission(['all']), 
  updateTenantRole
);

router.delete('/roles/:roleId', 
  tenantAuthAndValidationMiddleware, 
  requireTenantPermission(['all']), 
  deleteTenantRole
);

module.exports = router; 