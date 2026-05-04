const express = require('express');
const { 
  getArticles,
  createArticle,
  deleteArticle,
  serveArticleCover,
  askOracle
} = require('../controllers/kennisbankController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { uploadKnowledgeCover } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all articles (available to all authenticated users)
router.get('/articles', getArticles);

// Cover image (auth + blob, zelfde patroon als incident-bijlagen)
router.get('/articles/:id/cover', serveArticleCover);

// Create new article (available to all authenticated users); optioneel bestand `cover`
router.post('/articles', uploadKnowledgeCover, createArticle);

// Eigen artikel of Admin: verwijderen
router.delete('/articles/:id', deleteArticle);

// Ask the Oracle (available to all authenticated users)
router.post('/oracle', askOracle);

module.exports = router;

