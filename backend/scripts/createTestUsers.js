const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function createTestUsers() {
  try {
    const client = await pool.connect();
    
    // Hash password
    const password = await bcrypt.hash('test123', 10);

    const rolesResult = await client.query('SELECT id, name FROM Roles');
    const roleByName = Object.fromEntries(
      rolesResult.rows.map((row) => [row.name, row.id])
    );

    if (!roleByName.SAC || !roleByName.Admin || !roleByName.Stakeholder) {
      throw new Error('Required roles missing. Run scripts/setupDatabase.js first.');
    }

    // Upsert users by email and enforce correct role/password.
    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id
    `, ['sac_user', 'sac@test.com', password, roleByName.SAC]);

    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id
    `, ['admin_user', 'admin@test.com', password, roleByName.Admin]);

    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id
    `, ['viewer_user', 'viewer@test.com', password, roleByName.Stakeholder]);
    
    console.log('✅ Test users created successfully!');
    console.log('Password for all test users: test123');
    console.log('');
    console.log('Test accounts:');
    console.log('- sac@test.com (SAC role)');
    console.log('- admin@test.com (Admin role)');
    console.log('- viewer@test.com (Stakeholder role)');
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test users:', err.message);
    process.exit(1);
  }
}

createTestUsers(); 