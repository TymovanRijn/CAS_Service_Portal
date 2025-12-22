const express = require('express');
const router = express.Router();
const { authMiddleware, requireSAC, requireAdmin } = require('../middleware/authMiddleware');
const {
  getUserSchedules,
  getAllSchedules,
  createAvailability,
  updateSchedule,
  approveRejectSchedule,
  deleteSchedule,
  getSACUsers
} = require('../controllers/scheduleController');

// SAC routes - require SAC or Admin role
router.get('/my-schedules', authMiddleware, requireSAC, getUserSchedules);
router.post('/availability', authMiddleware, requireSAC, createAvailability);
router.put('/:id', authMiddleware, requireSAC, updateSchedule);
router.delete('/:id', authMiddleware, requireSAC, deleteSchedule);

// Admin routes - require Admin role
router.get('/all', authMiddleware, requireAdmin, getAllSchedules);
router.put('/:id/approve-reject', authMiddleware, requireAdmin, approveRejectSchedule);
router.get('/sac-users', authMiddleware, requireAdmin, getSACUsers);

module.exports = router;

