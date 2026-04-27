const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function createTestUsers() {
  try {
    const client = await pool.connect();
    
    const roleId = async (name) => {
      const { rows } = await client.query('SELECT id FROM Roles WHERE name = $1', [name]);
      if (!rows.length) {
        throw new Error(
          `Rol "${name}" ontbreekt. Draai eerst: node scripts/setupDatabase.js`
        );
      }
      return rows[0].id;
    };
    
    const idSAC = await roleId('SAC');
    const idAdmin = await roleId('Admin');
    const idStakeholder = await roleId('Stakeholder');
    
    // Hash password
    const password = await bcrypt.hash('test123', 10);

    // Upsert users by email and enforce correct role/password.
    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id
    `, ['sac_user', 'sac@test.com', password, idSAC]);

    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id
    `, ['admin_user', 'admin@test.com', password, idAdmin]);

    await client.query(`
      INSERT INTO Users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id
    `, ['viewer_user', 'viewer@test.com', password, idStakeholder]);
    
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