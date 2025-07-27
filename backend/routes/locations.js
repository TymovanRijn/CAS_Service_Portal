const express = require('express');
const { 
  getLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation 
} = require('../controllers/categoryController');
const { tenantAuthAndValidationMiddleware, requireTenantPermission } = require('../middleware/tenantMiddleware');

const router = express.Router();

// All routes require tenant authentication and validation
router.use(tenantAuthAndValidationMiddleware);

// Get all locations
router.get('/', requireTenantPermission(['all', 'locations:read', 'categories', 'incidents']), getLocations);

// Create location
router.post('/', requireTenantPermission(['all', 'locations:create', 'categories']), createLocation);

// Update location
router.put('/:id', requireTenantPermission(['all', 'locations:update', 'categories']), updateLocation);

// Delete location
router.delete('/:id', requireTenantPermission(['all', 'locations:delete', 'categories']), deleteLocation);

module.exports = router;
