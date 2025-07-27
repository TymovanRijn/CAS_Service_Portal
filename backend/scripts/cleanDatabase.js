const { pool } = require('../config/db');

async function cleanDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting complete database cleanup...');
    
    // Step 1: Drop all tenant schemas
    console.log('🗑️  Dropping all tenant schemas...');
    const schemas = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `);
    
    for (const schema of schemas.rows) {
      console.log(`   - Dropping schema: ${schema.schema_name}`);
      await client.query(`DROP SCHEMA IF EXISTS ${schema.schema_name} CASCADE`);
    }
    
    // Step 2: Drop global tables that should be tenant-specific
    console.log('🗑️  Dropping old global tables...');
    const tablesToDrop = [
      'knowledge_base',
      'incidents', 
      'actions',
      'users',
      'roles',
      'categories',
      'locations',
      'incident_attachments',
      'bak_inventory',
      'audit_logs',
      'kpi_records'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   - Dropped table: ${table}`);
      } catch (error) {
        console.log(`   - Table ${table} did not exist`);
      }
    }
    
    // Step 3: Clean tenant-related tables
    console.log('🗑️  Cleaning tenant data...');
    await client.query('DELETE FROM tenant_settings');
    await client.query('DELETE FROM tenants');
    
    // Step 4: Reset sequences
    console.log('🔄 Resetting sequences...');
    await client.query('ALTER SEQUENCE tenants_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE tenant_settings_id_seq RESTART WITH 1');
    
    console.log('✅ Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    client.release();
  }
}

async function setupFreshDatabase() {
  console.log('🚀 Setting up fresh multi-tenant database...');
  
  // Import the setup script
  const setupScript = require('./setupMultiTenantDatabase');
  await setupScript();
  
  console.log('✅ Fresh database setup completed!');
}

async function createTestTenantWithData() {
  const client = await pool.connect();
  
  try {
    console.log('🏢 Creating test tenant: Custom Airport Solutions...');
    
    // Create tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (name, subdomain, database_schema, is_active, primary_color, secondary_color)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      'Custom Airport Solutions',
      'cas',
      'tenant_cas',
      true,
      '#1E40AF', // Blue
      '#F59E0B'  // Amber
    ]);
    
    const tenant = tenantResult.rows[0];
    console.log(`✅ Tenant created: ${tenant.name} (ID: ${tenant.id})`);
    
    // Create tenant schema
    await client.query(`
      SELECT create_tenant_schema('${tenant.database_schema}')
    `);
    console.log(`✅ Tenant schema created: ${tenant.database_schema}`);
    
    // Create test user in tenant schema
    await client.query(`SET search_path TO ${tenant.database_schema}, public`);
    
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const userResult = await client.query(`
      INSERT INTO users (username, email, password_hash, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      'klaas.vanrijn',
      'klaas.vanrijn@cas-nl.com',
      hashedPassword,
      1, // Tenant Admin role
      true
    ]);
    
    console.log(`✅ Test user created: ${userResult.rows[0].email}`);
    
    // Add some test knowledge base entries
    await client.query(`
      INSERT INTO knowledge_base (title, content, category, tags, author_id, ai_processed)
      VALUES 
        ('Security Incident Response', 'Wanneer er een security incident plaatsvindt, volg deze stappen: 1. Isoleer het systeem, 2. Documenteer alles, 3. Informeer management, 4. Start onderzoek.', 'Security', '["security", "incident", "response"]', $1, false),
        ('Baggage Handling Protocol', 'Voor bagage afhandeling: 1. Scan alle koffers, 2. Controleer gewicht, 3. Route naar juiste gate, 4. Update tracking systeem.', 'Operations', '["baggage", "handling", "protocol"]', $1, false),
        ('Emergency Procedures', 'Bij noodgevallen op de luchthaven: 1. Activeer noodprotocol, 2. Evacueer indien nodig, 3. Contacteer hulpdiensten, 4. Communiceer met passagiers.', 'Emergency', '["emergency", "procedures", "safety"]', $1, false)
    `, [userResult.rows[0].id]);
    
    console.log('✅ Test knowledge base entries created');
    
    // Add some test incidents
    await client.query(`
      INSERT INTO incidents (title, description, status, priority, category_id, location_id, created_by)
      VALUES 
        ('Baggage Scanner Malfunction', 'Scanner at Gate A is not working properly', 'Open', 'High', 1, 1, $1),
        ('Network Connectivity Issue', 'WiFi down in Terminal 2', 'In Progress', 'Medium', 4, 2, $1),
        ('Security Breach Alert', 'Unauthorized access detected in restricted area', 'Open', 'Critical', 2, 3, $1)
    `, [userResult.rows[0].id]);
    
    console.log('✅ Test incidents created');
    
    // Add some test actions
    await client.query(`
      INSERT INTO actions (incident_id, action_description, status, created_by)
      VALUES 
        (1, 'Contact maintenance team for scanner repair', 'Pending', $1),
        (2, 'Reset network equipment in Terminal 2', 'In Progress', $1),
        (3, 'Review security footage and access logs', 'Pending', $1)
    `, [userResult.rows[0].id]);
    
    console.log('✅ Test actions created');
    
    // Reset search path
    await client.query('SET search_path TO public');
    
    console.log('🎉 Test tenant with sample data created successfully!');
    console.log('📝 Login credentials:');
    console.log('   Email: klaas.vanrijn@cas-nl.com');
    console.log('   Password: password123');
    console.log('   Tenant: Custom Airport Solutions');
    
  } catch (error) {
    console.error('❌ Error creating test tenant:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await cleanDatabase();
    await setupFreshDatabase();
    await createTestTenantWithData();
    
    console.log('🎯 COMPLETE DATABASE RESET FINISHED!');
    console.log('🔐 You can now login with:');
    console.log('   - Email: klaas.vanrijn@cas-nl.com');
    console.log('   - Password: password123');
    console.log('   - Tenant: Custom Airport Solutions');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { cleanDatabase, setupFreshDatabase, createTestTenantWithData }; 