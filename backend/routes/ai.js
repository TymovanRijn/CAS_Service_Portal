const express = require('express');
const { 
  generateMonthlySummary,
  getAISummaries,
  getAISummaryByMonth,
  getAIInsights,
  testAI,
  servePDF,
  forceRefreshAIInsights,
  getAIInsightsCacheStatus
} = require('../controllers/aiController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All AI routes require authentication
router.use(authMiddleware);

// Test AI functionality (available to all authenticated users)
router.get('/test', testAI);

// Get real-time AI insights for dashboard (cached)
router.get('/insights', requireRole(['SAC', 'Admin', 'Dashboard Viewer']), getAIInsights);

// Force refresh AI insights (manual refresh)
router.post('/insights/refresh', requireRole(['SAC', 'Admin']), forceRefreshAIInsights);

// Get AI insights cache status (for debugging)
router.get('/insights/status', requireRole(['Admin']), getAIInsightsCacheStatus);

// Monthly summary routes (Admin and Dashboard Viewer only)
router.get('/summaries', requireRole(['Admin', 'Dashboard Viewer']), getAISummaries);
router.get('/summaries/:month', requireRole(['Admin', 'Dashboard Viewer']), getAISummaryByMonth);
router.post('/summaries/generate', requireRole(['Admin']), generateMonthlySummary);

// PDF serving route (Admin and Dashboard Viewer only)
router.get('/summaries/:month/pdf', requireRole(['Admin', 'Dashboard Viewer']), servePDF);

module.exports = router; 