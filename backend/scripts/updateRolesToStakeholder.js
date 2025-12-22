const { pool } = require('../config/db');

async function updateRolesToStakeholder() {
  try {
    const client = await pool.connect();
    
    console.log('🔄 Updating roles from "Dashboard Viewer" to "Stakeholder"...');
    
    // First, check if "Dashboard Viewer" role exists
    const checkResult = await client.query(
      'SELECT id, name FROM Roles WHERE name = $1',
      ['Dashboard Viewer']
    );
    
    if (checkResult.rows.length === 0) {
      console.log('ℹ️  No "Dashboard Viewer" role found. Checking if "Stakeholder" already exists...');
      
      const stakeholderCheck = await client.query(
        'SELECT id, name FROM Roles WHERE name = $1',
        ['Stakeholder']
      );
      
      if (stakeholderCheck.rows.length > 0) {
        console.log('✅ "Stakeholder" role already exists. No update needed.');
        client.release();
        process.exit(0);
      } else {
        console.log('⚠️  Neither "Dashboard Viewer" nor "Stakeholder" role exists. Creating "Stakeholder" role...');
        await client.query(`
          INSERT INTO Roles (name, description) 
          VALUES ('Stakeholder', 'Stakeholder - Read-only access to dashboards and reports for management')
          ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ "Stakeholder" role created.');
        client.release();
        process.exit(0);
      }
    }
    
    const dashboardViewerId = checkResult.rows[0].id;
    
    // Check if "Stakeholder" role already exists
    const stakeholderCheck = await client.query(
      'SELECT id, name FROM Roles WHERE name = $1',
      ['Stakeholder']
    );
    
    let stakeholderId;
    
    if (stakeholderCheck.rows.length > 0) {
      // Stakeholder role exists, use it
      stakeholderId = stakeholderCheck.rows[0].id;
      console.log('✅ "Stakeholder" role already exists. Updating user references...');
    } else {
      // Create Stakeholder role
      console.log('📝 Creating "Stakeholder" role...');
      const insertResult = await client.query(`
        INSERT INTO Roles (name, description) 
        VALUES ('Stakeholder', 'Stakeholder - Read-only access to dashboards and reports for management')
        RETURNING id
      `);
      stakeholderId = insertResult.rows[0].id;
      console.log('✅ "Stakeholder" role created.');
    }
    
    // Update all users with Dashboard Viewer role to Stakeholder
    const updateResult = await client.query(
      'UPDATE Users SET role_id = $1 WHERE role_id = $2 RETURNING id, username, email',
      [stakeholderId, dashboardViewerId]
    );
    
    console.log(`✅ Updated ${updateResult.rows.length} user(s) from "Dashboard Viewer" to "Stakeholder":`);
    updateResult.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.email})`);
    });
    
    // Optionally delete the old "Dashboard Viewer" role (only if no users reference it)
    const remainingUsers = await client.query(
      'SELECT COUNT(*) as count FROM Users WHERE role_id = $1',
      [dashboardViewerId]
    );
    
    if (parseInt(remainingUsers.rows[0].count) === 0) {
      await client.query('DELETE FROM Roles WHERE id = $1', [dashboardViewerId]);
      console.log('🗑️  Deleted old "Dashboard Viewer" role (no longer in use).');
    } else {
      console.log('⚠️  Keeping "Dashboard Viewer" role (still has users assigned).');
    }
    
    console.log('');
    console.log('✅ Role update completed successfully!');
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating roles:', err.message);
    console.error(err);
    process.exit(1);
  }
}

updateRolesToStakeholder();

