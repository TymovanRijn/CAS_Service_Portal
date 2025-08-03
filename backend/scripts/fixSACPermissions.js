const { pool } = require('../config/db');

const fixSACPermissions = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing SAC permissions for all tenants...');
    
    // Get all tenants
    const tenantsResult = await client.query('SELECT id, name, database_schema FROM tenants WHERE is_active = true');
    
    for (const tenant of tenantsResult.rows) {
      console.log(`\n📋 Processing tenant: ${tenant.name} (${tenant.database_schema})`);
      
      try {
        // Set search path to tenant schema
        await client.query(`SET search_path TO ${tenant.database_schema}, public`);
        
        // Check if SAC role exists
        const sacRoleResult = await client.query(
          "SELECT id, name, permissions FROM roles WHERE name = 'SAC'"
        );
        
        if (sacRoleResult.rows.length === 0) {
          console.log(`❌ No SAC role found for tenant ${tenant.name}`);
          continue;
        }
        
        const sacRole = sacRoleResult.rows[0];
        console.log(`📝 Found SAC role: ${sacRole.name} (ID: ${sacRole.id})`);
        console.log(`🔑 Current permissions: ${sacRole.permissions?.join(', ') || 'None'}`);
        
        // Give SAC only operational permissions (NOT admin permissions)
        const sacPermissions = [
          'dashboard',
          'incidents', 
          'knowledge_base',
          'actions',
          'reports'
          // NOT 'admin' - SAC users should not have admin access
          // NOT 'kpi_dashboard' - SAC users should not have KPI dashboard access
          // NOT 'ai_insights' - SAC users should not have AI insights access
        ];
        
        // Update role with correct SAC permissions
        await client.query(
          'UPDATE roles SET permissions = $1 WHERE id = $2',
          [JSON.stringify(sacPermissions), sacRole.id]
        );
        
        console.log(`✅ Updated SAC role with correct permissions: ${sacPermissions.join(', ')}`);
        
        // Check SAC users
        const sacUsersResult = await client.query(
          'SELECT id, username, email, is_active FROM users WHERE role_id = $1 AND is_active = true',
          [sacRole.id]
        );
        
        console.log(`👥 Found ${sacUsersResult.rows.length} SAC users:`);
        sacUsersResult.rows.forEach(user => {
          console.log(`   - ${user.username} (${user.email}) - Active: ${user.is_active}`);
        });
        
      } catch (error) {
        console.log(`❌ Error processing tenant ${tenant.name}:`, error.message);
      }
    }
    
    // Reset search path
    await client.query('SET search_path TO public');
    
    console.log('\n✅ SAC permissions update completed!');
    console.log('🎉 SAC users should now have access to ALL tabs!');
    
  } catch (error) {
    console.error('❌ Error updating SAC permissions:', error);
  } finally {
    client.release();
  }
};

// Run the script
fixSACPermissions()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 