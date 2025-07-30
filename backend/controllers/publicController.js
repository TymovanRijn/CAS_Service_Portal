const { pool } = require('../config/db');

// Cache for tenant data (5 minutes)
let tenantCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Get public tenant information for login page
const getPublicTenants = async (req, res) => {
  try {
    const { active } = req.query;
    
    // Check cache first
    const now = Date.now();
    if (tenantCache.data && (now - tenantCache.timestamp) < tenantCache.ttl) {
      return res.json(tenantCache.data);
    }
    
    const client = await pool.connect();
    
    // Build query based on active parameter
    let query = `
      SELECT 
        id,
        name,
        subdomain,
        logo_path,
        primary_color,
        secondary_color,
        is_active,
        created_at,
        updated_at
      FROM tenants 
    `;
    
    const queryParams = [];
    
    if (active !== undefined) {
      query += ` WHERE is_active = $1`;
      queryParams.push(active === 'true');
    } else {
      query += ` WHERE is_active = true`;
    }
    
    query += ` ORDER BY name ASC`;
    
    const result = await client.query(query, queryParams);
    client.release();
    
    // Transform data for consistent response
    const tenants = result.rows.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      logo_path: tenant.logo_path,
      primary_color: tenant.primary_color,
      secondary_color: tenant.secondary_color,
      is_active: tenant.is_active,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at
    }));
    
    const response = { 
      tenants,
      count: tenants.length,
      timestamp: new Date().toISOString()
    };
    
    // Update cache
    tenantCache.data = response;
    tenantCache.timestamp = now;
    
    res.json(response);
    
  } catch (err) {
    console.error('Get public tenants error:', err);
    
    // Provide more specific error messages
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'Database connection failed. Please try again later.',
        error: 'Database unavailable'
      });
    }
    
    if (err.code === 'ENOTFOUND') {
      return res.status(503).json({ 
        message: 'Service temporarily unavailable. Please try again later.',
        error: 'Service unavailable'
      });
    }
    
    res.status(500).json({ 
      message: 'Error fetching tenant information',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// Clear tenant cache (for admin use)
const clearTenantCache = async (req, res) => {
  try {
    tenantCache.data = null;
    tenantCache.timestamp = null;
    
    res.json({ 
      message: 'Tenant cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Clear tenant cache error:', err);
    res.status(500).json({ 
      message: 'Error clearing tenant cache',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// Get tenant cache status
const getTenantCacheStatus = async (req, res) => {
  try {
    const now = Date.now();
    const isExpired = !tenantCache.data || (now - tenantCache.timestamp) >= tenantCache.ttl;
    
    res.json({
      cached: !isExpired,
      timestamp: tenantCache.timestamp,
      age: tenantCache.timestamp ? now - tenantCache.timestamp : null,
      ttl: tenantCache.ttl,
      data_count: tenantCache.data ? tenantCache.data.tenants.length : 0
    });
  } catch (err) {
    console.error('Get tenant cache status error:', err);
    res.status(500).json({ 
      message: 'Error getting cache status',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

module.exports = {
  getPublicTenants,
  clearTenantCache,
  getTenantCacheStatus
}; 