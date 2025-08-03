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

// Get all locations - accessible to ALL authenticated users
router.get('/', getLocations);

// Create location - admin only
router.post('/', requireTenantPermission(['all', 'admin']), createLocation);

// Update location - admin only
router.put('/:id', requireTenantPermission(['all', 'admin']), updateLocation);

// Delete location - admin only
router.delete('/:id', requireTenantPermission(['all', 'admin']), deleteLocation);

module.exports = router;
