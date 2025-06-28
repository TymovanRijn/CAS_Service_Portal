const express = require('express');
const { 
  getTodaysIncidents, 
  getIncidents, 
  getArchivedIncidents,
  createIncident, 
  updateIncident,
  getIncidentStats,
  getIncidentAttachments,
  downloadAttachment
} = require('../controllers/incidentController');
const { authMiddleware, requireSAC, requireDashboardAccess } = require('../middleware/authMiddleware');
const { uploadIncidentAttachments } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All incident routes require authentication
router.use(authMiddleware);

// Get incident statistics - Dashboard Viewers need access for KPI Dashboard
router.get('/stats', requireDashboardAccess, getIncidentStats);

// Get today's incidents
router.get('/today', requireSAC, getTodaysIncidents);

// Get all incidents
router.get('/', requireSAC, getIncidents);

// Get archived incidents with filtering and pagination - Dashboard Viewers need access for KPI Dashboard
router.get('/archive', requireDashboardAccess, getArchivedIncidents);

// Create new incident (with file upload support)
router.post('/', requireSAC, uploadIncidentAttachments, createIncident);

// Update incident
router.put('/:id', requireSAC, updateIncident);

// Get incident attachments
router.get('/:incidentId/attachments', requireSAC, getIncidentAttachments);

// Download attachment
router.get('/attachments/:attachmentId', requireSAC, downloadAttachment);

module.exports = router; 