const express = require('express');
const { 
  getPendingActions, 
  getActions, 
  getArchivedActions,
  createAction, 
  takeAction,
  releaseAction,
  updateAction,
  updateActionStatus,
  getActionStats,
  getAvailableUsers
} = require('../controllers/actionController');
const { tenantAuthAndValidationMiddleware, requireTenantPermission } = require('../middleware/tenantMiddleware');

const router = express.Router();

// All routes require tenant authentication and validation
router.use(tenantAuthAndValidationMiddleware);

// Get action statistics - Dashboard Viewers need access for KPI Dashboard
router.get('/stats', requireTenantPermission(['all', 'dashboard:read', 'actions:read']), getActionStats);

// Get pending actions for current user or unassigned
router.get('/pending', requireTenantPermission(['all', 'actions', 'actions:read']), getPendingActions);

// Get all actions with filtering and pagination
router.get('/', requireTenantPermission(['all', 'actions', 'actions:read']), getActions);

// Get archived (completed) actions - Dashboard Viewers need access for KPI Dashboard
router.get('/archive', requireTenantPermission(['all', 'dashboard:read', 'actions:read']), getArchivedActions);

// Get available users for assignment
router.get('/users', requireTenantPermission(['all', 'actions', 'actions:read']), getAvailableUsers);

// Create new action
router.post('/', requireTenantPermission(['all', 'actions:create', 'actions']), createAction);

// Take action (assign to current user)
router.put('/:id/take', requireTenantPermission(['all', 'actions:update', 'actions']), takeAction);

// Release action (unassign from current user)
router.put('/:id/release', requireTenantPermission(['all', 'actions:update', 'actions']), releaseAction);

// Update action (general update)
router.put('/:id', requireTenantPermission(['all', 'actions:update', 'actions']), updateAction);

// Update action status
router.put('/:id/status', requireTenantPermission(['all', 'actions:update', 'actions']), updateActionStatus);

module.exports = router; 