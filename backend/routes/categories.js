const express = require('express');
const { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getCategoryStats
} = require('../controllers/categoryController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { tenantAuthAndValidationMiddleware, requireTenantPermission } = require('../middleware/tenantMiddleware');

const router = express.Router();

// All routes require tenant authentication and validation
router.use(tenantAuthAndValidationMiddleware);

// Get categories - accessible to ALL authenticated users
router.get('/', getCategories);

// Get category statistics - accessible to ALL authenticated users
router.get('/stats', getCategoryStats);

// Create category - admin only
router.post('/', requireTenantPermission(['all', 'admin']), createCategory);

// Update category - admin only
router.put('/:id', requireTenantPermission(['all', 'admin']), updateCategory);

// Delete category - admin only
router.delete('/:id', requireTenantPermission(['all', 'admin']), deleteCategory);

module.exports = router; 