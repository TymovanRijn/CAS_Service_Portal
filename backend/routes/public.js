const express = require('express');
const router = express.Router();
const { getPublicTenants } = require('../controllers/publicController');

// Public routes (no authentication required)
router.get('/tenants', getPublicTenants);

module.exports = router; 