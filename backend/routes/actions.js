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
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get action statistics - Dashboard Viewers need access for KPI Dashboard
router.get('/stats', requireRole(['SAC', 'Admin', 'Dashboard Viewer']), getActionStats);

// Get pending actions for current user or unassigned
router.get('/pending', requireRole(['SAC', 'Admin']), getPendingActions);

// Get all actions with filtering and pagination
router.get('/', requireRole(['SAC', 'Admin']), getActions);

// Get archived (completed) actions - Dashboard Viewers need access for KPI Dashboard
router.get('/archive', requireRole(['SAC', 'Admin', 'Dashboard Viewer']), getArchivedActions);

// Get available users for assignment
router.get('/users', requireRole(['SAC', 'Admin']), getAvailableUsers);

// Create new action
router.post('/', requireRole(['SAC', 'Admin']), createAction);

// Take action (assign to current user)
router.put('/:id/take', requireRole(['SAC', 'Admin']), takeAction);

// Release action (unassign from current user)
router.put('/:id/release', requireRole(['SAC', 'Admin']), releaseAction);

// Update action (general update)
router.put('/:id', requireRole(['SAC', 'Admin']), updateAction);

// Update action status
router.put('/:id/status', requireRole(['SAC', 'Admin']), updateActionStatus);

module.exports = router; 