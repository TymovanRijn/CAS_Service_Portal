const express = require('express');
const { generateDailyReport, getAvailableReportDates } = require('../controllers/reportController');
const { tenantAuthAndValidationMiddleware, requireTenantPermission } = require('../middleware/tenantMiddleware');

const router = express.Router();

// All routes require tenant authentication and validation
router.use(tenantAuthAndValidationMiddleware);

// Get available report dates
router.get('/dates', requireTenantPermission(['all', 'reports', 'reports:read']), getAvailableReportDates);

// Generate daily report (PDF download)
router.get('/daily', requireTenantPermission(['all', 'reports', 'reports:read']), generateDailyReport);

module.exports = router; 