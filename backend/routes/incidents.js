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
const { uploadIncidentAttachments } = require('../middleware/uploadMiddleware');
const { tenantAuthAndValidationMiddleware, requireTenantPermission } = require('../middleware/tenantMiddleware');

const router = express.Router();

// All incident routes require tenant authentication and validation
router.use(tenantAuthAndValidationMiddleware);

// Get incident statistics - Dashboard Viewers need access for KPI Dashboard
router.get('/stats', requireTenantPermission(['all', 'dashboard:read', 'incidents:read']), getIncidentStats);

// Get today's incidents
router.get('/today', requireTenantPermission(['all', 'incidents:read', 'incidents']), getTodaysIncidents);

// Get all incidents
router.get('/', requireTenantPermission(['all', 'incidents:read', 'incidents']), getIncidents);

// Get archived incidents with filtering and pagination - Dashboard Viewers need access for KPI Dashboard
router.get('/archive', requireTenantPermission(['all', 'dashboard:read', 'incidents:read']), getArchivedIncidents);

// Create new incident (with file upload support)
router.post('/', requireTenantPermission(['all', 'incidents:create', 'incidents']), uploadIncidentAttachments, createIncident);

// Update incident
router.put('/:id', requireTenantPermission(['all', 'incidents:update', 'incidents']), updateIncident);

// Get incident attachments
router.get('/:incidentId/attachments', requireTenantPermission(['all', 'incidents:read', 'incidents']), getIncidentAttachments);

// Download attachment
router.get('/attachments/:attachmentId', requireTenantPermission(['all', 'incidents:read', 'incidents']), downloadAttachment);

module.exports = router; 