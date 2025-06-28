const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function createTestUsers() {
  try {
    const client = await pool.connect();
    
    // Hash password
    const password = await bcrypt.hash('test123', 10);
    
    // Create test users
    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, ['sac_user', 'sac@test.com', password, 1]);
    
    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, ['admin_user', 'admin@test.com', password, 2]);
    
    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, ['viewer_user', 'viewer@test.com', password, 3]);
    
    console.log('✅ Test users created successfully!');
    console.log('Password for all test users: test123');
    console.log('');
    console.log('Test accounts:');
    console.log('- sac@test.com (SAC role)');
    console.log('- admin@test.com (Admin role)');
    console.log('- viewer@test.com (Dashboard Viewer role)');
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test users:', err.message);
    process.exit(1);
  }
}

createTestUsers(); 