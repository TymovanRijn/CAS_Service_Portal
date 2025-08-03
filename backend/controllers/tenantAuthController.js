const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getTenantConnection } = require('../middleware/tenantMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Tenant user registration
const registerTenantUser = async (req, res) => {
  const { username, email, password, role_id, roleId } = req.body;
  const selectedRoleId = role_id || roleId || 3; // Default to Security Officer role
  
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Validate role exists
    const roleCheck = await client.query('SELECT id, name FROM roles WHERE id = $1', [selectedRoleId]);
    if (roleCheck.rows.length === 0) {
      client.release();
      return res.status(400).json({ message: 'Invalid role specified' });
    }
    
    const result = await client.query(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id, username, email, created_at', 
      [username, email, hashedPassword, selectedRoleId]
    );
    
    client.release();
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        ...result.rows[0],
        role: roleCheck.rows[0].name,
        tenant: req.tenant.name
      }
    });
  } catch (err) {
    console.error('Tenant user registration error:', err);
    res.status(500).json({ message: 'Error registering user' });
  }
};

// Tenant user login
const loginTenantUser = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    const result = await client.query(
      `SELECT u.*, r.name as role_name, r.description as role_description, r.permissions 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = $1 AND u.is_active = true`, 
      [email]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        tenantId: req.tenant.id,
        isSuperAdmin: false
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Don't send password hash in response
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({ 
      token,
      user: {
        ...userWithoutPassword,
        tenant: {
          id: req.tenant.id,
          name: req.tenant.name,
          subdomain: req.tenant.subdomain,
          settings: req.tenant.settings
        }
      },
      message: 'Login successful'
    });
  } catch (err) {
    console.error('Tenant user login error:', err);
    res.status(500).json({ message: 'Error logging in' });
  }
};

// Get tenant user profile
const getTenantUserProfile = async (req, res) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    const result = await client.query(
      `SELECT u.id, u.username, u.email, u.created_at, u.updated_at, u.is_active,
              r.name as role_name, r.description as role_description, r.permissions
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [req.user.userId]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      user: {
        ...result.rows[0],
        tenant: {
          id: req.tenant.id,
          name: req.tenant.name,
          subdomain: req.tenant.subdomain,
          settings: req.tenant.settings
        }
      }
    });
  } catch (err) {
    console.error('Get tenant user profile error:', err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Get all users in tenant (admin only)
const getTenantUsers = async (req, res) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    const result = await client.query(`
      SELECT u.id, u.username, u.email, u.created_at, u.updated_at, u.is_active,
             r.name as role_name, r.description as role_description
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      ORDER BY u.created_at DESC
    `);
    client.release();
    
    res.json({ 
      users: result.rows,
      tenant: req.tenant.name
    });
  } catch (err) {
    console.error('Get tenant users error:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Update tenant user
const updateTenantUser = async (req, res) => {
  const { userId } = req.params;
  const { username, email, role_id, roleId, isActive } = req.body;
  const selectedRoleId = role_id || roleId;
  
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if user exists
    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate role if provided
    if (selectedRoleId) {
      const roleCheck = await client.query('SELECT id FROM roles WHERE id = $1', [selectedRoleId]);
      if (roleCheck.rows.length === 0) {
        client.release();
        return res.status(400).json({ message: 'Invalid role specified' });
      }
    }
    
    const result = await client.query(`
      UPDATE users 
      SET username = COALESCE($1, username),
          email = COALESCE($2, email),
          role_id = COALESCE($3, role_id),
          is_active = COALESCE($4, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, username, email, is_active, updated_at
    `, [username, email, selectedRoleId, isActive, userId]);
    
    client.release();
    
    res.json({ 
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Update tenant user error:', err);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// Delete tenant user
const deleteTenantUser = async (req, res) => {
  const { userId } = req.params;
  
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if user exists first
    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete all references to this user first
    // 1. Update incidents to set created_by to NULL or delete them
    await client.query('UPDATE incidents SET created_by = NULL WHERE created_by = $1', [userId]);
    
    // 2. Update actions to set assigned_to to NULL or delete them  
    await client.query('UPDATE actions SET assigned_to = NULL WHERE assigned_to = $1', [userId]);
    
    // 3. Update actions to set created_by to NULL
    await client.query('UPDATE actions SET created_by = NULL WHERE created_by = $1', [userId]);
    
    // 4. Update knowledge base entries to set author_id to NULL
    await client.query('UPDATE knowledge_base SET author_id = NULL WHERE author_id = $1', [userId]);
    
    // Now delete the user
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    client.release();
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete tenant user error:', err);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Get available roles for tenant
const getTenantRoles = async (req, res) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    const result = await client.query('SELECT * FROM roles ORDER BY name');
    client.release();
    
    res.json({ roles: result.rows });
  } catch (err) {
    console.error('Get tenant roles error:', err);
    res.status(500).json({ message: 'Error fetching roles' });
  }
};

// Create new role
const createTenantRole = async (req, res) => {
  const { name, description, permissions } = req.body;
  
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Role name is required' });
    }
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions array is required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if role already exists
    const existingRole = await client.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existingRole.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'Role with this name already exists' });
    }
    
    const result = await client.query(
      'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING *', 
      [name, description || '', Array.isArray(permissions) ? JSON.stringify(permissions) : permissions]
    );
    
    client.release();
    
    res.status(201).json({ 
      message: 'Role created successfully',
      role: {
        ...result.rows[0],
        permissions: typeof result.rows[0].permissions === 'string' 
          ? JSON.parse(result.rows[0].permissions) 
          : result.rows[0].permissions
      }
    });
  } catch (err) {
    console.error('Create tenant role error:', err);
    res.status(500).json({ message: 'Error creating role' });
  }
};

// Update existing role
const updateTenantRole = async (req, res) => {
  const { roleId } = req.params;
  const { name, description, permissions } = req.body;
  
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Role name is required' });
    }
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions array is required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if role exists
    const existingRole = await client.query('SELECT id FROM roles WHERE id = $1', [roleId]);
    if (existingRole.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if name is taken by another role
    const nameCheck = await client.query('SELECT id FROM roles WHERE name = $1 AND id != $2', [name, roleId]);
    if (nameCheck.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'Role with this name already exists' });
    }
    
    const result = await client.query(
      'UPDATE roles SET name = $1, description = $2, permissions = $3 WHERE id = $4 RETURNING *', 
      [name, description || '', Array.isArray(permissions) ? JSON.stringify(permissions) : permissions, roleId]
    );
    
    client.release();
    
    res.json({ 
      message: 'Role updated successfully',
      role: {
        ...result.rows[0],
        permissions: typeof result.rows[0].permissions === 'string' 
          ? JSON.parse(result.rows[0].permissions) 
          : result.rows[0].permissions
      }
    });
  } catch (err) {
    console.error('Update tenant role error:', err);
    res.status(500).json({ message: 'Error updating role' });
  }
};

// Delete role
const deleteTenantRole = async (req, res) => {
  const { roleId } = req.params;
  
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);
    
    // Check if role exists
    const existingRole = await client.query('SELECT id, name FROM roles WHERE id = $1', [roleId]);
    if (existingRole.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if role is in use by any users
    const usersWithRole = await client.query('SELECT COUNT(*) as count FROM users WHERE role_id = $1', [roleId]);
    if (parseInt(usersWithRole.rows[0].count) > 0) {
      client.release();
      return res.status(400).json({ 
        message: `Cannot delete role '${existingRole.rows[0].name}' because it is assigned to ${usersWithRole.rows[0].count} user(s)` 
      });
    }
    
    await client.query('DELETE FROM roles WHERE id = $1', [roleId]);
    client.release();
    
    res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    console.error('Delete tenant role error:', err);
    res.status(500).json({ message: 'Error deleting role' });
  }
};

// Get available permissions list
const getAvailablePermissions = async (req, res) => {
  try {
    // Define simplified permission groups for easier role management
    const availablePermissions = [
      // System Level
      { id: 'all', name: '🔓 Volledige Toegang', description: 'Alle rechten en functies', category: '🛡️ Systeem', isSpecial: true },
      
      // Core Features - Simplified
      { id: 'dashboard:read', name: '📊 Dashboard Bekijken', description: 'Dashboard en statistieken bekijken', category: '📈 Dashboard' },
      
      { id: 'incidents:read', name: '👁️ Incidenten Bekijken', description: 'Incidenten inzien', category: '🚨 Incidenten' },
      { id: 'incidents:create', name: '➕ Incidenten Aanmaken', description: 'Nieuwe incidenten rapporteren', category: '🚨 Incidenten' },
      { id: 'incidents:update', name: '✏️ Incidenten Bewerken', description: 'Incidenten wijzigen en updaten', category: '🚨 Incidenten' },
      { id: 'incidents', name: '🔧 Incidenten Volledig', description: 'Alle incident functies', category: '🚨 Incidenten', isGrouped: true },
      
      { id: 'actions:read', name: '👁️ Acties Bekijken', description: 'Acties en taken inzien', category: '⚡ Acties' },
      { id: 'actions:create', name: '➕ Acties Aanmaken', description: 'Nieuwe acties creëren', category: '⚡ Acties' },
      { id: 'actions:update', name: '🔄 Acties Oppakken', description: 'Acties overnemen en uitvoeren', category: '⚡ Acties' },
      { id: 'actions', name: '🔧 Acties Volledig', description: 'Alle actie functies', category: '⚡ Acties', isGrouped: true },
      
      { id: 'reports', name: '📋 Rapporten', description: 'Rapporten en analyses bekijken', category: '📊 Rapporten' },
      
      { id: 'knowledge_base:read', name: '👁️ Kennisbank Bekijken', description: 'Kennisbank raadplegen', category: '📚 Kennisbank' },
      { id: 'knowledge_base:create', name: '➕ Kennisbank Schrijven', description: 'Nieuwe artikelen toevoegen', category: '📚 Kennisbank' },
      { id: 'knowledge_base:update', name: '✏️ Kennisbank Bewerken', description: 'Artikelen wijzigen', category: '📚 Kennisbank' },
      { id: 'knowledge_base:delete', name: '🗑️ Kennisbank Verwijderen', description: 'Artikelen verwijderen', category: '📚 Kennisbank' },
      
      // Management Features
      { id: 'categories:read', name: '👁️ Categorieën Bekijken', description: 'Categorieën inzien', category: '🏷️ Beheer' },
      { id: 'categories:create', name: '➕ Categorieën Maken', description: 'Nieuwe categorieën aanmaken', category: '🏷️ Beheer' },
      { id: 'locations:read', name: '👁️ Locaties Bekijken', description: 'Locaties inzien', category: '🏷️ Beheer' },
      { id: 'locations:create', name: '➕ Locaties Maken', description: 'Nieuwe locaties aanmaken', category: '🏷️ Beheer' },
      
      { id: 'users:read', name: '👁️ Gebruikers Bekijken', description: 'Gebruikerslijst inzien', category: '👥 Gebruikers' },
      { id: 'users:create', name: '➕ Gebruikers Aanmaken', description: 'Nieuwe gebruikers toevoegen', category: '👥 Gebruikers' },
      { id: 'users:update', name: '✏️ Gebruikers Bewerken', description: 'Gebruikers wijzigen', category: '👥 Gebruikers' }
    ];
    
    res.json({ permissions: availablePermissions });
  } catch (err) {
    console.error('Get available permissions error:', err);
    res.status(500).json({ message: 'Error fetching available permissions' });
  }
};

module.exports = {
  registerTenantUser,
  loginTenantUser,
  getTenantUserProfile,
  getTenantUsers,
  updateTenantUser,
  deleteTenantUser,
  getTenantRoles,
  createTenantRole,
  updateTenantRole,
  deleteTenantRole,
  getAvailablePermissions
}; 