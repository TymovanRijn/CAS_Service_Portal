const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { createTenant } = require('../scripts/setupMultiTenantDatabase');
const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/logos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, 'logo_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Super Admin Authentication
const loginSuperAdmin = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM super_admins WHERE email = $1', 
      [email]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const superAdmin = result.rows[0];
    const match = await bcrypt.compare(password, superAdmin.password_hash);
    
    if (!match) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { 
        userId: superAdmin.id, 
        email: superAdmin.email,
        isSuperAdmin: true
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    const { password_hash, ...superAdminWithoutPassword } = superAdmin;
    
    res.json({ 
      token,
      user: { ...superAdminWithoutPassword, isSuperAdmin: true },
      message: 'Super Admin login successful'
    });
  } catch (err) {
    console.error('Super Admin login error:', err);
    res.status(500).json({ message: 'Error logging in' });
  }
};

// Get Super Admin Profile
const getSuperAdminProfile = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, username, email, created_at FROM super_admins WHERE id = $1',
      [req.user.userId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Super Admin not found' });
    }
    
    res.json({ 
      user: { ...result.rows[0], isSuperAdmin: true }
    });
  } catch (err) {
    console.error('Get super admin profile error:', err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Tenant Management
const getAllTenants = async (req, res) => {
  try {
    const client = await pool.connect();
    
    // First get basic tenant info
    const tenantsResult = await client.query(`
      SELECT t.*, sa.username as created_by_username
      FROM tenants t
      LEFT JOIN super_admins sa ON t.created_by = sa.id
      ORDER BY t.created_at DESC
    `);
    
    // Then get counts for each tenant
    const tenantsWithCounts = await Promise.all(
      tenantsResult.rows.map(async (tenant) => {
        try {
          const userCountResult = await client.query(`SELECT COUNT(*) FROM ${tenant.database_schema}.users`);
          const incidentCountResult = await client.query(`SELECT COUNT(*) FROM ${tenant.database_schema}.incidents`);
          
          return {
            ...tenant,
            user_count: parseInt(userCountResult.rows[0].count),
            incident_count: parseInt(incidentCountResult.rows[0].count)
          };
        } catch (schemaError) {
          console.warn(`Error accessing schema ${tenant.database_schema}:`, schemaError.message);
          return {
            ...tenant,
            user_count: 0,
            incident_count: 0
          };
        }
      })
    );
    
    client.release();
    
    res.json({ tenants: tenantsWithCounts });
  } catch (err) {
    console.error('Get all tenants error:', err);
    res.status(500).json({ message: 'Error fetching tenants' });
  }
};

const getTenantById = async (req, res) => {
  const { tenantId } = req.params;
  
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT t.*, sa.username as created_by_username
      FROM tenants t
      LEFT JOIN super_admins sa ON t.created_by = sa.id
      WHERE t.id = $1
    `, [tenantId]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    res.json({ tenant: result.rows[0] });
  } catch (err) {
    console.error('Get tenant by ID error:', err);
    res.status(500).json({ message: 'Error fetching tenant' });
  }
};

const createNewTenant = async (req, res) => {
  const { 
    name, 
    subdomain, 
    contactEmail, 
    contactPhone, 
    address, 
    primaryColor, 
    secondaryColor,
    adminUser 
  } = req.body;
  
  try {
    // Validate required fields
    if (!name || !subdomain || !adminUser || !adminUser.username || !adminUser.email || !adminUser.password) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, subdomain, and admin user details are required' 
      });
    }
    
    // Check if subdomain is available
    const client = await pool.connect();
    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE subdomain = $1',
      [subdomain.toLowerCase()]
    );
    
    if (existingTenant.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'Subdomain already exists' });
    }
    client.release();
    
    // Create tenant with schema
    const tenant = await createTenant({
      name,
      subdomain: subdomain.toLowerCase(),
      contactEmail,
      contactPhone,
      address,
      primaryColor,
      secondaryColor
    }, req.user.userId);
    
    // Create tenant admin user
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    
    const tenantClient = await pool.connect();
    await tenantClient.query(`SET search_path TO ${tenant.database_schema}, public`);
    
    // Get tenant admin role ID
    const roleResult = await tenantClient.query(
      "SELECT id FROM roles WHERE name = 'Tenant Admin'"
    );
    
    if (roleResult.rows.length === 0) {
      throw new Error('Tenant Admin role not found in tenant schema');
    }
    
    // Create admin user
    await tenantClient.query(`
      INSERT INTO users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
    `, [adminUser.username, adminUser.email, hashedPassword, roleResult.rows[0].id]);
    
    await tenantClient.query('SET search_path TO public');
    tenantClient.release();
    
    res.status(201).json({ 
      message: 'Tenant created successfully',
      tenant: tenant,
      adminUser: {
        username: adminUser.username,
        email: adminUser.email
      }
    });
    
  } catch (err) {
    console.error('Create tenant error:', err);
    res.status(500).json({ message: 'Error creating tenant: ' + err.message });
  }
};

const updateTenant = async (req, res) => {
  const { tenantId } = req.params;
  const { 
    name, 
    contactEmail, 
    contactPhone, 
    address, 
    primaryColor, 
    secondaryColor, 
    isActive 
  } = req.body;
  
  try {
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE tenants 
      SET name = COALESCE($1, name),
          contact_email = COALESCE($2, contact_email),
          contact_phone = COALESCE($3, contact_phone),
          address = COALESCE($4, address),
          primary_color = COALESCE($5, primary_color),
          secondary_color = COALESCE($6, secondary_color),
          is_active = COALESCE($7, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, contactEmail, contactPhone, address, primaryColor, secondaryColor, isActive, tenantId]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    res.json({ 
      message: 'Tenant updated successfully',
      tenant: result.rows[0]
    });
  } catch (err) {
    console.error('Update tenant error:', err);
    res.status(500).json({ message: 'Error updating tenant' });
  }
};

const uploadTenantLogo = async (req, res) => {
  const { tenantId } = req.params;
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file provided' });
    }
    
    const logoPath = req.file.path;
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE tenants 
      SET logo_path = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [logoPath, tenantId]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    res.json({ 
      message: 'Logo uploaded successfully',
      logoPath: logoPath,
      tenant: result.rows[0]
    });
  } catch (err) {
    console.error('Upload logo error:', err);
    res.status(500).json({ message: 'Error uploading logo' });
  }
};

const deleteTenant = async (req, res) => {
  const { tenantId } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Get tenant info first
    const tenantResult = await client.query(
      'SELECT database_schema FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    const schema = tenantResult.rows[0].database_schema;
    
    // Drop the tenant schema (this will cascade delete all tables)
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    
    // Delete tenant record
    await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    
    client.release();
    
    res.json({ message: 'Tenant deleted successfully' });
  } catch (err) {
    console.error('Delete tenant error:', err);
    res.status(500).json({ message: 'Error deleting tenant' });
  }
};

// Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get basic tenant stats
    const tenantStats = await client.query(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(*) FILTER (WHERE is_active = true) as active_tenants,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_tenants_30d
      FROM tenants
    `);
    
    // Get all active tenants for detailed stats
    const activeTenantsResult = await client.query(`
      SELECT id, name, database_schema FROM tenants WHERE is_active = true
    `);
    
    let totalUsers = 0;
    let totalIncidents = 0;
    let totalActions = 0;
    
    // Aggregate stats from all tenant schemas
    for (const tenant of activeTenantsResult.rows) {
      try {
        const userCount = await client.query(`SELECT COUNT(*) FROM ${tenant.database_schema}.users`);
        const incidentCount = await client.query(`SELECT COUNT(*) FROM ${tenant.database_schema}.incidents`);
        const actionCount = await client.query(`SELECT COUNT(*) FROM ${tenant.database_schema}.actions`);
        
        totalUsers += parseInt(userCount.rows[0].count);
        totalIncidents += parseInt(incidentCount.rows[0].count);
        totalActions += parseInt(actionCount.rows[0].count);
      } catch (schemaError) {
        console.warn(`Error accessing schema ${tenant.database_schema}:`, schemaError.message);
      }
    }
    
    client.release();
    
    res.json({
      tenants: tenantStats.rows[0],
      totals: {
        users: totalUsers,
        incidents: totalIncidents,
        actions: totalActions
      }
    });
    
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
};

module.exports = {
  loginSuperAdmin,
  getSuperAdminProfile,
  getAllTenants,
  getTenantById,
  createNewTenant,
  updateTenant,
  uploadTenantLogo: [upload.single('logo'), uploadTenantLogo],
  deleteTenant,
  getDashboardStats
}; 