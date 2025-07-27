const { pool } = require('../config/db');
const { getTenantConnection } = require('../middleware/tenantMiddleware');
const { processContentWithAI, generateTags, searchKnowledgeBase } = require('../ai/services/knowledgeBaseService');
const path = require('path');
const fs = require('fs').promises;

// Get all knowledge base entries with pagination and filtering
const getKnowledgeBaseEntries = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tags, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT kb.*, u.username as author_name, u.email
      FROM knowledge_base kb
      JOIN users u ON kb.author_id = u.id
    `;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    if (category) {
      paramCount++;
      whereConditions.push(`kb.category = $${paramCount}`);
      queryParams.push(category);
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      paramCount++;
      whereConditions.push(`kb.tags ?| $${paramCount}`);
      queryParams.push(tagArray);
    }
    
    if (search) {
      paramCount++;
      whereConditions.push(`(kb.title ILIKE $${paramCount} OR kb.content ILIKE $${paramCount} OR kb.ai_summary ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ` ORDER BY kb.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);
    
    // Use tenant-specific connection
    const client = await getTenantConnection(req.tenant.schema);
    const result = await client.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM knowledge_base kb';
    let countParams = [];
    let countParamCount = 0;
    
    if (category) {
      countParamCount++;
      countQuery += ` WHERE kb.category = $${countParamCount}`;
      countParams.push(category);
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      countParamCount++;
      const whereClause = countParamCount === 1 ? ' WHERE ' : ' AND ';
      countQuery += `${whereClause}kb.tags ?| $${countParamCount}`;
      countParams.push(tagArray);
    }
    
    if (search) {
      countParamCount++;
      const whereClause = countParamCount === 1 ? ' WHERE ' : ' AND ';
      countQuery += `${whereClause}(kb.title ILIKE $${countParamCount} OR kb.content ILIKE $${countParamCount} OR kb.ai_summary ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await client.query(countQuery, countParams);
    client.release();
    
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching knowledge base entries:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single knowledge base entry
const getKnowledgeBaseEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use tenant-specific connection
    const client = await getTenantConnection(req.tenant.schema);
    
    // Increment view count
    await client.query('UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = $1', [id]);
    
    const result = await client.query(`
      SELECT kb.*, u.username as author_name, u.email
      FROM knowledge_base kb
      JOIN users u ON kb.author_id = u.id
      WHERE kb.id = $1
    `, [id]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Knowledge base entry not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching knowledge base entry:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new knowledge base entry
const createKnowledgeBaseEntry = async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    const authorId = req.user.userId || req.user.id;
    const imagePath = req.file ? req.file.path : null;
    
    // Use content exactly as user wrote it (no AI processing)
    const allTags = tags || [];
    
    // Use tenant-specific connection
    const client = await getTenantConnection(req.tenant.schema);
    
    const result = await client.query(`
      INSERT INTO knowledge_base (title, content, image_path, category, tags, author_id, ai_processed, ai_summary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, content, imagePath, category, JSON.stringify(allTags), authorId, false, null]);
    
    client.release();
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating knowledge base entry:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update knowledge base entry
const updateKnowledgeBaseEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags } = req.body;
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;
    
    // Use tenant-specific connection
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if user owns the entry or is admin
    const existingEntry = await client.query('SELECT * FROM knowledge_base WHERE id = $1', [id]);
    
    if (existingEntry.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Knowledge base entry not found' });
    }
    
    if (existingEntry.rows[0].author_id !== userId && userRole !== 'Admin' && userRole !== 'Tenant Admin') {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to update this entry' });
    }
    
    // Use content exactly as user wrote it (no AI processing)
    const allTags = tags || [];
    
    const result = await client.query(`
      UPDATE knowledge_base 
      SET title = $1, content = $2, category = $3, tags = $4, ai_summary = $5, ai_processed = false
      WHERE id = $6
      RETURNING *
    `, [title, content, category, JSON.stringify(allTags), null, id]);
    
    client.release();
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating knowledge base entry:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete knowledge base entry
const deleteKnowledgeBaseEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;
    
    // Use tenant-specific connection
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if user owns the entry or is admin
    const existingEntry = await client.query('SELECT * FROM knowledge_base WHERE id = $1', [id]);
    
    if (existingEntry.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Knowledge base entry not found' });
    }
    
    if (existingEntry.rows[0].author_id !== userId && userRole !== 'Admin' && userRole !== 'Tenant Admin') {
      client.release();
      return res.status(403).json({ success: false, message: 'Not authorized to delete this entry' });
    }
    
    // Delete associated image if exists
    if (existingEntry.rows[0].image_path) {
      try {
        await fs.unlink(existingEntry.rows[0].image_path);
      } catch (err) {
        console.log('Could not delete image file:', err.message);
      }
    }
    
    await client.query('DELETE FROM knowledge_base WHERE id = $1', [id]);
    client.release();
    
    res.json({ success: true, message: 'Knowledge base entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting knowledge base entry:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// AI-powered search
const aiSearch = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    
    const results = await searchKnowledgeBase(query, req.tenant);
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error in AI search:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get popular tags
const getPopularTags = async (req, res) => {
  try {
    // Since we're not using AI-generated tags anymore, return empty array
    // Users will use the predefined tag suggestions in the frontend
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    // Use tenant-specific connection
    const client = await getTenantConnection(req.tenant.schema);
    
    const result = await client.query(`
      SELECT category, COUNT(*) as count
      FROM knowledge_base
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);
    
    client.release();
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to generate AI summary
const generateAISummary = async (content) => {
  try {
    // This would integrate with your AI service
    const summary = content.length > 200 ? content.substring(0, 200) + '...' : content;
    return summary;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return content.substring(0, 200) + '...';
  }
};

module.exports = {
  getKnowledgeBaseEntries,
  getKnowledgeBaseEntry,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  deleteKnowledgeBaseEntry,
  aiSearch,
  getPopularTags,
  getCategories
}; 