const { pool } = require('../config/db');

const checkTenants = async () => {
  const client = await pool.connect();
  
  try {
    // Check all tenants
    const tenantsResult = await client.query('SELECT id, name, database_schema FROM tenants WHERE is_active = true');
    
    console.log('📋 Available tenants:');
    tenantsResult.rows.forEach(tenant => {
      console.log(`  - ID: ${tenant.id}, Name: ${tenant.name}, Schema: ${tenant.database_schema}`);
    });
    
    if (tenantsResult.rows.length === 0) {
      console.log('❌ No active tenants found!');
      return;
    }
    
    // Check if tenant schemas exist
    for (const tenant of tenantsResult.rows) {
      console.log(`\n🔍 Checking schema for tenant: ${tenant.name}`);
      
      try {
        await client.query(`SET search_path TO ${tenant.database_schema}, public`);
        
        // Check if roles table exists
        const rolesCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = 'roles'
          )
        `, [tenant.database_schema]);
        
        if (rolesCheck.rows[0].exists) {
          console.log(`✅ Schema ${tenant.database_schema} exists with roles table`);
          
          // Check SAC role
          const sacRoleResult = await client.query(
            "SELECT id, name, permissions FROM roles WHERE name = 'SAC'"
          );
          
          if (sacRoleResult.rows.length > 0) {
            const sacRole = sacRoleResult.rows[0];
            console.log(`📋 SAC role found: ${sacRole.name} (ID: ${sacRole.id})`);
            console.log(`🔑 Permissions: ${sacRole.permissions?.join(', ') || 'None'}`);
          } else {
            console.log(`❌ No SAC role found in ${tenant.schema}`);
          }
        } else {
          console.log(`❌ Schema ${tenant.schema} exists but no roles table`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking schema ${tenant.schema}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking tenants:', error);
  } finally {
    client.release();
  }
};

// Run the script
checkTenants()
  .then(() => {
    console.log('✅ Tenant check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }); 