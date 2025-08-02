const { pool } = require('../config/db');

async function createMissingTenantSchemas() {
  const client = await pool.connect();
  
  try {
    console.log('🏗️  Creating missing tenant schemas...\n');

    // Get all tenants
    const tenantsResult = await client.query('SELECT id, name, subdomain, database_schema FROM tenants WHERE is_active = true');
    
    for (const tenant of tenantsResult.rows) {
      console.log(`📝 Checking schema for tenant: ${tenant.name} (${tenant.subdomain})`);
      
      const schemaName = tenant.database_schema;
      
      // Check if schema exists
      const schemaExists = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schemaName]);
      
      if (schemaExists.rows.length === 0) {
        console.log(`   🚧 Creating schema: ${schemaName}`);
        
        // Create the tenant schema
        await client.query('SELECT create_tenant_schema($1)', [schemaName]);
        
        console.log(`   ✅ Schema created: ${schemaName}`);
      } else {
        console.log(`   ✅ Schema already exists: ${schemaName}`);
      }
    }

    console.log('🎉 All missing tenant schemas created successfully!');

  } catch (error) {
    console.error('❌ Error creating tenant schemas:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await createMissingTenantSchemas();
      process.exit(0);
    } catch (error) {
      console.error('Setup failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { createMissingTenantSchemas }; 