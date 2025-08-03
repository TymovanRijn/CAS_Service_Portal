const { pool } = require('../config/db');

const checkAndFixSACPermissions = async () => {
  const client = await pool.connect();
  
  try {
    // Set search path to tenant 2 (assuming that's where the SAC user is)
    await client.query('SET search_path TO tenant_2, public');
    
    // Check current SAC role
    const sacRoleResult = await client.query(
      "SELECT id, name, permissions FROM roles WHERE name = 'SAC'"
    );
    
    if (sacRoleResult.rows.length === 0) {
      console.log('❌ SAC role not found!');
      return;
    }
    
    const sacRole = sacRoleResult.rows[0];
    console.log('📋 Current SAC role permissions:', sacRole.permissions);
    
    // Define the required permissions for SAC
    const requiredPermissions = [
      'dashboard:read',
      'incidents:read', 
      'incidents:create',
      'incidents:update',
      'actions:read',
      'actions:create', 
      'actions:update',
      'knowledge_base:read',
      'knowledge_base:create',
      'knowledge_base:update'
    ];
    
    // Check if all required permissions are present
    const missingPermissions = requiredPermissions.filter(
      perm => !sacRole.permissions.includes(perm)
    );
    
    if (missingPermissions.length > 0) {
      console.log('⚠️ Missing permissions:', missingPermissions);
      
      // Add missing permissions
      const updatedPermissions = [...new Set([...sacRole.permissions, ...missingPermissions])];
      
      await client.query(
        'UPDATE roles SET permissions = $1 WHERE id = $2',
        [updatedPermissions, sacRole.id]
      );
      
      console.log('✅ Updated SAC role with missing permissions');
      console.log('📋 New permissions:', updatedPermissions);
    } else {
      console.log('✅ SAC role has all required permissions');
    }
    
    // Check SAC users
    const sacUsersResult = await client.query(`
      SELECT u.id, u.username, u.email, u.is_active, r.name as role_name, r.permissions
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE r.name = 'SAC'
    `);
    
    console.log(`\n👥 Found ${sacUsersResult.rows.length} SAC users:`);
    sacUsersResult.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - Active: ${user.is_active}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking SAC permissions:', error);
  } finally {
    client.release();
  }
};

// Run the script
checkAndFixSACPermissions()
  .then(() => {
    console.log('✅ SAC permissions check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 