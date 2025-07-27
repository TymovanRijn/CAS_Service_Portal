const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { tenantAuthAndValidationMiddleware, requireTenantPermission } = require('../middleware/tenantMiddleware');
const {
  getKnowledgeBaseEntries,
  getKnowledgeBaseEntry,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  aiSearch,
  getPopularTags,
  getCategories
} = require('../controllers/knowledgeBaseController');
const { generateKnowledgeBaseAnswer } = require('../ai/services/knowledgeBaseService');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/knowledge-base');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Alleen afbeeldingen zijn toegestaan (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// All routes require tenant authentication and validation
router.use(tenantAuthAndValidationMiddleware);

// Get all knowledge base entries
router.get('/', requireTenantPermission(['all', 'knowledge:read', 'knowledge']), getKnowledgeBaseEntries);

// Get single knowledge base entry
router.get('/:id', requireTenantPermission(['all', 'knowledge:read', 'knowledge']), getKnowledgeBaseEntry);

// Create new knowledge base entry
router.post('/', 
  requireTenantPermission(['all', 'knowledge:create', 'knowledge']), 
  upload.single('image'), 
  createKnowledgeBaseEntry
);

// Update knowledge base entry
router.put('/:id', 
  requireTenantPermission(['all', 'knowledge:update', 'knowledge']), 
  upload.single('image'), 
  updateKnowledgeBaseEntry
);

// Delete knowledge base entry
router.delete('/:id', requireTenantPermission(['all', 'knowledge:delete', 'knowledge']), deleteKnowledgeBaseEntry);

// AI-powered search
router.post('/search', requireTenantPermission(['all', 'knowledge:read', 'knowledge']), aiSearch);

// AI-powered question answering
router.post('/ask', requireTenantPermission(['all', 'knowledge:read', 'knowledge']), async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vraag is verplicht' 
      });
    }
    
    const result = await generateKnowledgeBaseAnswer(question, req.tenant);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in AI question answering:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error bij het beantwoorden van de vraag' 
    });
  }
});

// Get popular tags
router.get('/meta/tags', requireTenantPermission(['all', 'knowledge:read', 'knowledge']), getPopularTags);

// Get categories
router.get('/meta/categories', requireTenantPermission(['all', 'knowledge:read', 'knowledge']), getCategories);

// Serve uploaded images
router.get('/images/:filename', requireTenantPermission(['all', 'knowledge:read', 'knowledge']), async (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, '../uploads/knowledge-base', filename);
    
    // Check if file exists
    try {
      await fs.access(imagePath);
      res.sendFile(imagePath);
    } catch (error) {
      res.status(404).json({ success: false, message: 'Afbeelding niet gevonden' });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 