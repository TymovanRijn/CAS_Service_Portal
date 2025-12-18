const express = require('express');
const { 
  getArticles,
  createArticle,
  askOracle
} = require('../controllers/kennisbankController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all articles (available to all authenticated users)
router.get('/articles', getArticles);

// Create new article (available to all authenticated users)
router.post('/articles', createArticle);

// Ask the Oracle (available to all authenticated users)
router.post('/oracle', askOracle);

module.exports = router;
