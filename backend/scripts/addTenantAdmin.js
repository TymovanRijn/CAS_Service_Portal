const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function addTenantAdmin(tenantSubdomain, adminData) {
  const client = await pool.connect();
  
  try {
    // Get tenant info
    const tenantResult = await client.query(
      'SELECT * FROM tenants WHERE subdomain = $1',
      [tenantSubdomain]
    );
    
    if (tenantResult.rows.length === 0) {
      throw new Error(`Tenant with subdomain "${tenantSubdomain}" not found`);
    }
    
    const tenant = tenantResult.rows[0];
    const schemaName = tenant.database_schema;
    
    console.log(`🏢 Adding admin user to tenant: ${tenant.name} (${schemaName})`);
    
    // Set search path to tenant schema
    await client.query(`SET search_path TO ${schemaName}, public`);
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminData.email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`ℹ️  User with email ${adminData.email} already exists`);
      await client.query('SET search_path TO public');
      client.release();
      return;
    }
    
    // Get tenant admin role ID
    const roleResult = await client.query(
      "SELECT id FROM roles WHERE name = 'Tenant Admin'"
    );
    
    if (roleResult.rows.length === 0) {
      throw new Error('Tenant Admin role not found in tenant schema');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // Create admin user
    const userResult = await client.query(`
      INSERT INTO users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email
    `, [adminData.username, adminData.email, hashedPassword, roleResult.rows[0].id]);
    
    console.log(`✅ Admin user created: ${userResult.rows[0].email}`);
    console.log(`👤 User ID: ${userResult.rows[0].id}`);
    
    // Reset search path
    await client.query('SET search_path TO public');
    client.release();
    
    return userResult.rows[0];
    
  } catch (error) {
    await client.query('SET search_path TO public');
    client.release();
    console.error('❌ Error adding tenant admin:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const tenantSubdomain = process.argv[2];
  const username = process.argv[3];
  const email = process.argv[4];
  const password = process.argv[5];
  
  if (!tenantSubdomain || !username || !email || !password) {
    console.log('Usage: node addTenantAdmin.js <subdomain> <username> <email> <password>');
    console.log('Example: node addTenantAdmin.js cas admin admin@cas-nl.com Admin123!');
    process.exit(1);
  }
  
  (async () => {
    try {
      await addTenantAdmin(tenantSubdomain, {
        username,
        email,
        password
      });
      console.log('\n🎉 Tenant admin added successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Failed to add tenant admin:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { addTenantAdmin }; 