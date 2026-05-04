const express = require('express');
const { 
  getUsers,
  getRoles,
  createUser,
  updateUser,
  deleteUser,
  uploadUserAvatar,
  deleteUserAvatar,
  getUserStats
} = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const { uploadUserAvatar: uploadAvatarMiddleware } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Admin only routes for user management
router.get('/users', requireRole(['Admin']), getUsers);
router.get('/roles', requireRole(['Admin']), getRoles);
router.get('/stats', requireRole(['Admin']), getUserStats);
router.post('/users', requireRole(['Admin']), createUser);
router.put('/users/:id', requireRole(['Admin']), updateUser);
router.delete('/users/:id', requireRole(['Admin']), deleteUser);
router.post('/users/:id/avatar', requireRole(['Admin']), uploadAvatarMiddleware, uploadUserAvatar);
router.delete('/users/:id/avatar', requireRole(['Admin']), deleteUserAvatar);

module.exports = router; 