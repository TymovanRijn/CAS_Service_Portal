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

// Get categories
router.get('/', requireTenantPermission(['all', 'categories:read', 'categories']), getCategories);

// Get category statistics
router.get('/stats', requireTenantPermission(['all', 'categories:read', 'categories']), getCategoryStats);

// Create category
router.post('/', requireTenantPermission(['all', 'categories:create', 'categories']), createCategory);

// Update category
router.put('/:id', requireTenantPermission(['all', 'categories:update', 'categories']), updateCategory);

// Delete category
router.delete('/:id', requireTenantPermission(['all', 'categories:delete', 'categories']), deleteCategory);

module.exports = router; 