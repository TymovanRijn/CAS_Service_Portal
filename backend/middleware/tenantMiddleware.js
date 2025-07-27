const { pool } = require('../config/db');

// Combined middleware that first authenticates, then validates tenant access
const tenantAuthAndValidationMiddleware = async (req, res, next) => {
  try {
    // Step 1: Authentication
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid token.' });
    }
    
    // Check if it's a super admin token - they bypass tenant requirements
    if (decoded.isSuperAdmin) {
      req.user = {
        ...decoded,
        isSuperAdmin: true
      };
      return next();
    }
    
    // Step 2: Extract tenant ID for regular users
    let tenantId = null;
    
    // Extract tenant from different sources
    if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
    } else if (req.query.tenant) {
      tenantId = req.query.tenant;
    } else if (req.body.tenantId) {
      tenantId = req.body.tenantId;
    } else if (decoded.tenantId) {
      // From JWT token
      tenantId = decoded.tenantId;
    }
    
    if (!tenantId) {
      return res.status(400).json({ 
        message: 'Tenant ID is required. Please specify tenant in header, query, body, or ensure your token contains tenant information.' 
      });
    }
    
    // Step 3: Validate tenant exists and is active
    const client = await pool.connect();
    const tenantResult = await client.query(
      'SELECT * FROM tenants WHERE id = $1 AND is_active = true',
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ 
        message: 'Tenant not found or inactive.' 
      });
    }
    
    const tenant = tenantResult.rows[0];
    
    // Add tenant context to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      schema: tenant.database_schema,
      settings: {
        primaryColor: tenant.primary_color,
        secondaryColor: tenant.secondary_color,
        logoPath: tenant.logo_path
      }
    };
    
    // Step 4: Validate user exists in tenant schema and get permissions
    const tenantClient = await getTenantConnection(req.tenant.schema);
    const userResult = await tenantClient.query(
      `SELECT u.*, r.name as role_name, r.permissions 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1 AND u.is_active = true`, 
      [decoded.userId]
    );
    tenantClient.release();
    client.release();

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found in tenant or user is inactive.' });
    }

    const user = userResult.rows[0];
    
    // Add user context to request
    req.user = {
      ...decoded,
      tenantId: req.tenant.id,
      role: user.role_name,
      permissions: user.permissions,
      userData: user,
      isSuperAdmin: false
    };
    
    next();
    
  } catch (error) {
    console.error('Tenant auth and validation middleware error:', error);
    res.status(500).json({ message: 'Error processing authentication and tenant information.' });
  }
};

// Original middleware for backward compatibility (deprecated)
const tenantMiddleware = async (req, res, next) => {
  try {
    let tenantId = null;
    let tenantSchema = null;
    
    // Extract tenant from different sources
    if (req.headers['x-tenant-id']) {
      // From header (for API calls)
      tenantId = req.headers['x-tenant-id'];
    } else if (req.query.tenant) {
      // From query parameter
      tenantId = req.query.tenant;
    } else if (req.body.tenantId) {
      // From request body
      tenantId = req.body.tenantId;
    } else if (req.user && req.user.tenantId) {
      // From authenticated user context
      tenantId = req.user.tenantId;
    }
    
    if (!tenantId) {
      return res.status(400).json({ 
        message: 'Tenant ID is required. Please specify tenant in header, query, or body.' 
      });
    }
    
    // Validate tenant exists and is active
    const client = await pool.connect();
    const tenantResult = await client.query(
      'SELECT * FROM tenants WHERE id = $1 AND is_active = true',
      [tenantId]
    );
    client.release();
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Tenant not found or inactive.' 
      });
    }
    
    const tenant = tenantResult.rows[0];
    tenantSchema = tenant.database_schema;
    
    // Add tenant context to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      schema: tenantSchema,
      settings: {
        primaryColor: tenant.primary_color,
        secondaryColor: tenant.secondary_color,
        logoPath: tenant.logo_path
      }
    };
    
    next();
    
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ message: 'Error processing tenant information.' });
  }
};

// Middleware specifically for super admin routes
const superAdminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ 
      message: 'Super Admin access required.' 
    });
  }
  next();
};

// Helper function to execute queries in tenant schema
const executeInTenantSchema = async (schema, query, params = []) => {
  const client = await pool.connect();
  
  try {
    // Set search path to tenant schema
    await client.query(`SET search_path TO ${schema}, public`);
    
    // Execute the query
    const result = await client.query(query, params);
    
    // Reset search path
    await client.query('SET search_path TO public');
    
    return result;
    
  } finally {
    client.release();
  }
};

// Helper function to get tenant database connection with schema set
const getTenantConnection = async (schema) => {
  const client = await pool.connect();
  await client.query(`SET search_path TO ${schema}, public`);
  
  // Return client with release method that resets search path
  const originalRelease = client.release.bind(client);
  client.release = async () => {
    await client.query('SET search_path TO public');
    originalRelease();
  };
  
  return client;
};

// Middleware to validate tenant user authentication
const tenantAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if it's a super admin token
    if (decoded.isSuperAdmin) {
      req.user = {
        ...decoded,
        isSuperAdmin: true
      };
      return next();
    }
    
    // For tenant users, we need tenant context
    if (!req.tenant) {
      return res.status(400).json({ 
        message: 'Tenant context required for user authentication.' 
      });
    }
    
    // Validate user exists in tenant schema
    const client = await getTenantConnection(req.tenant.schema);
    const userResult = await client.query(
      `SELECT u.*, r.name as role_name, r.permissions 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1 AND u.is_active = true`, 
      [decoded.userId]
    );
    client.release();

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found in tenant.' });
    }

    const user = userResult.rows[0];
    
    req.user = {
      ...decoded,
      tenantId: req.tenant.id,
      role: user.role_name,
      permissions: user.permissions,
      userData: user,
      isSuperAdmin: false
    };
    
    next();
    
  } catch (err) {
    console.error('Tenant auth middleware error:', err);
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Permission checking middleware for tenant users
const requireTenantPermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (req.user.isSuperAdmin) {
      return next(); // Super admin has all permissions
    }
    
    if (!req.user.permissions) {
      return res.status(403).json({ message: 'No permissions defined for user.' });
    }
    
    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    
    // Check if user has 'all' permission
    if (userPermissions.includes('all')) {
      return next();
    }
    
    // Check specific permissions
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        message: `Access denied. Required permissions: ${requiredPermissions.join(', ')}` 
      });
    }
    
    next();
  };
};

module.exports = {
  tenantMiddleware,
  superAdminMiddleware,
  executeInTenantSchema,
  getTenantConnection,
  tenantAuthMiddleware,
  requireTenantPermission,
  tenantAuthAndValidationMiddleware
}; 