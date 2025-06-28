const express = require('express');
const { generateDailyReport, getAvailableReportDates } = require('../controllers/reportController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and Admin or Dashboard Viewer role
router.use(authMiddleware);
router.use(requireRole(['Admin', 'Dashboard Viewer']));

// Get available report dates
router.get('/dates', getAvailableReportDates);

// Generate daily report (PDF download)
router.get('/daily', generateDailyReport);

module.exports = router; 