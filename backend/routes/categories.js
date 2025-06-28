const express = require('express');
const { 
  getCategories, 
  getLocations,
  createCategory,
  updateCategory,
  deleteCategory,
  createLocation,
  updateLocation,
  deleteLocation,
  ensureDefaultEntries
} = require('../controllers/categoryController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all categories (SAC and Admin)
router.get('/categories', requireRole(['SAC', 'Admin']), getCategories);

// Get all locations (SAC and Admin)
router.get('/locations', requireRole(['SAC', 'Admin']), getLocations);

// Admin only routes for categories
router.post('/categories', requireRole(['Admin']), createCategory);
router.put('/categories/:id', requireRole(['Admin']), updateCategory);
router.delete('/categories/:id', requireRole(['Admin']), deleteCategory);

// Admin only routes for locations
router.post('/locations', requireRole(['Admin']), createLocation);
router.put('/locations/:id', requireRole(['Admin']), updateLocation);
router.delete('/locations/:id', requireRole(['Admin']), deleteLocation);

// Ensure default entries exist
router.post('/ensure-defaults', requireRole(['Admin']), ensureDefaultEntries);

module.exports = router; 