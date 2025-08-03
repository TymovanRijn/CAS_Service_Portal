const express = require('express');
const { 
  getUsers,
  getRoles,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userController');
const { tenantAuthAndValidationMiddleware, requireTenantPermission } = require('../middleware/tenantMiddleware');

const router = express.Router();

// All routes require tenant authentication and validation
router.use(tenantAuthAndValidationMiddleware);

// Get users - accessible to ALL authenticated users (needed for assignment)
router.get('/users', getUsers);

// Get roles - accessible to ALL authenticated users
router.get('/roles', getRoles);

// Get user stats - admin only
router.get('/stats', requireTenantPermission(['all', 'admin']), getUserStats);

// Create user - admin only
router.post('/users', requireTenantPermission(['all', 'admin']), createUser);

// Update user - admin only
router.put('/users/:id', requireTenantPermission(['all', 'admin']), updateUser);

// Delete user - admin only
router.delete('/users/:id', requireTenantPermission(['all', 'admin']), deleteUser);

module.exports = router; 