const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Starting complete database reset...\n');

    // ============= STEP 1: DROP ALL EXISTING SCHEMAS =============
    console.log('📋 Step 1: Dropping all existing schemas...');
    
    // Get all tenant schemas
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `);
    
    for (const schema of schemasResult.rows) {
      console.log(`   🗑️  Dropping schema: ${schema.schema_name}`);
      await client.query(`DROP SCHEMA IF EXISTS ${schema.schema_name} CASCADE`);
    }
    
    console.log('✅ All tenant schemas dropped\n');

    // ============= STEP 2: DROP ALL TABLES =============
    console.log('📋 Step 2: Dropping all tables...');
    
    // Drop all tables in correct order (due to foreign key constraints)
    const tablesToDrop = [
      'tenant_settings',
      'tenants', 
      'super_admins'
    ];
    
    for (const table of tablesToDrop) {
      console.log(`   🗑️  Dropping table: ${table}`);
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    
    console.log('✅ All tables dropped\n');

    // ============= STEP 3: RECREATE DATABASE STRUCTURE =============
    console.log('📋 Step 3: Recreating database structure...');
    
    // Create super_admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ super_admins table created');

    // Create tenants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        database_schema VARCHAR(100) UNIQUE NOT NULL,
        logo_path VARCHAR(500),
        primary_color VARCHAR(7) DEFAULT '#3B82F6',
        secondary_color VARCHAR(7) DEFAULT '#1E40AF',
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES super_admins(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ tenants table created');

    // Create tenant_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, setting_key)
      )
    `);
    console.log('   ✅ tenant_settings table created');

    // Create tenant schema template function
    await client.query(`
      CREATE OR REPLACE FUNCTION create_tenant_schema(schema_name TEXT)
      RETURNS VOID AS $$
      BEGIN
        -- Create the schema
        EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(schema_name);
        
        -- Set search path to the new schema
        EXECUTE 'SET search_path TO ' || quote_ident(schema_name) || ', public';
        
        -- Create Roles table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          permissions JSONB DEFAULT ''[]'',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create Users table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.roles(id),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create Categories table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          color VARCHAR(7) DEFAULT ''#6B7280'',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create Locations table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.locations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create Incidents table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.incidents (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          priority VARCHAR(20) DEFAULT ''Medium'',
          possible_solution TEXT,
          category_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.categories(id),
          location_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.locations(id),
          created_by INTEGER REFERENCES ' || quote_ident(schema_name) || '.users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          -- KPI Tracking Fields
          was_unregistered_incident BOOLEAN DEFAULT FALSE,
          requires_escalation BOOLEAN DEFAULT FALSE,
          escalation_reason VARCHAR(255),
          incorrect_diagnosis BOOLEAN DEFAULT FALSE,
          incorrect_service_party BOOLEAN DEFAULT FALSE,
          self_resolved_by_security BOOLEAN DEFAULT FALSE,
          self_resolution_description TEXT,
          estimated_downtime_minutes INTEGER,
          actual_response_time_minutes INTEGER,
          service_party_arrived_late BOOLEAN DEFAULT FALSE,
          multiple_service_parties_needed BOOLEAN DEFAULT FALSE
        )';
        
        -- Create Actions table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.actions (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.incidents(id),
          action_description TEXT NOT NULL,
          status VARCHAR(50) DEFAULT ''Pending'',
          assigned_to INTEGER REFERENCES ' || quote_ident(schema_name) || '.users(id),
          created_by INTEGER REFERENCES ' || quote_ident(schema_name) || '.users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create IncidentAttachments table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.incident_attachments (
          id SERIAL PRIMARY KEY,
          incident_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.incidents(id),
          file_path VARCHAR(500),
          original_name VARCHAR(255),
          file_size INTEGER,
          mime_type VARCHAR(100),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create Knowledge Base table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.knowledge_base (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          image_path VARCHAR(500),
          tags JSONB DEFAULT ''[]'',
          category VARCHAR(100),
          author_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.users(id),
          ai_processed BOOLEAN DEFAULT FALSE,
          ai_summary TEXT,
          view_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create indexes for performance
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || schema_name || '_incidents_created_at ON ' || quote_ident(schema_name) || '.incidents(created_at)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || schema_name || '_incidents_priority ON ' || quote_ident(schema_name) || '.incidents(priority)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || schema_name || '_actions_status ON ' || quote_ident(schema_name) || '.actions(status)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || schema_name || '_knowledge_base_tags ON ' || quote_ident(schema_name) || '.knowledge_base USING GIN (tags)';
        
        -- Insert default roles
        EXECUTE 'INSERT INTO ' || quote_ident(schema_name) || '.roles (name, description, permissions) VALUES 
          (''Tenant Admin'', ''Full access to tenant data and settings'', ''["all"]''),
          (''SAC'', ''Security Access Control - can manage incidents and actions'', ''["incidents", "actions", "reports"]''),
          (''Security Officer'', ''Can create and view incidents'', ''["incidents:read", "incidents:create"]''),
          (''Dashboard Viewer'', ''Read-only access to dashboards'', ''["dashboard:read"]'')
        ON CONFLICT DO NOTHING';
        
        -- Insert default categories
        EXECUTE 'INSERT INTO ' || quote_ident(schema_name) || '.categories (name, description, color) VALUES 
          (''Overig'', ''Algemene categorie voor diverse incidenten'', ''#6B7280''),
          (''Technisch'', ''Technische problemen en storingen'', ''#3B82F6''),
          (''Beveiliging'', ''Beveiligingsincidenten en meldingen'', ''#EF4444''),
          (''Faciliteiten'', ''Facilitaire problemen en onderhoud'', ''#10B981'')
        ON CONFLICT DO NOTHING';
        
        -- Insert default locations
        EXECUTE 'INSERT INTO ' || quote_ident(schema_name) || '.locations (name, description) VALUES 
          (''Overig'', ''Algemene locatie voor diverse incidenten''),
          (''Hoofdgebouw'', ''Hoofdgebouw en algemene ruimtes''),
          (''Parkeerplaats'', ''Parkeerplaatsen en externe gebieden''),
          (''Technische ruimte'', ''Technische ruimtes en serverruimtes'')
        ON CONFLICT DO NOTHING';
        
        -- Reset search path
        EXECUTE 'SET search_path TO public';
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Tenant schema template function created');
    
    console.log('✅ Database structure recreated\n');

    // ============= STEP 4: CREATE DEFAULT SUPER ADMIN =============
    console.log('📋 Step 4: Creating default super admin...');
    
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
    
    await client.query(`
      INSERT INTO super_admins (username, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        updated_at = CURRENT_TIMESTAMP
    `, ['superadmin', 'admin@cas-portal.com', hashedPassword]);
    
    console.log('✅ Default super admin created:');
    console.log('   📧 Email: admin@cas-portal.com');
    console.log('   🔑 Password: SuperAdmin123!\n');

    // ============= STEP 5: CREATE TENANT ADMIN =============
    console.log('📋 Step 5: Creating tenant admin...');
    
    const tenantAdminPassword = await bcrypt.hash('TenantAdmin123!', 10);
    
    const tenantAdminResult = await client.query(`
      INSERT INTO super_admins (username, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, ['tenant_admin', 'tenant.admin@cas-portal.com', tenantAdminPassword]);
    
    const tenantAdmin = tenantAdminResult.rows[0];
    console.log('✅ Tenant admin created:');
    console.log('   📧 Email: tenant.admin@cas-portal.com');
    console.log('   🔑 Password: TenantAdmin123!\n');

    // ============= STEP 6: CREATE TEST TENANTS =============
    console.log('📋 Step 6: Creating test tenants...');
    
    const testTenants = [
      {
        name: 'Custom Airport Solutions',
        subdomain: 'cas',
        contactEmail: 'admin@cas-nl.com',
        primaryColor: '#1E40AF',
        secondaryColor: '#F59E0B'
      },
      {
        name: 'TechCorp International',
        subdomain: 'techcorp',
        contactEmail: 'admin@techcorp.com',
        primaryColor: '#059669',
        secondaryColor: '#047857'
      },
      {
        name: 'Global Security Corp',
        subdomain: 'globalsec',
        contactEmail: 'admin@globalsec.com',
        primaryColor: '#DC2626',
        secondaryColor: '#B91C1C'
      }
    ];

    for (const tenantData of testTenants) {
      const schemaName = `tenant_${tenantData.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      // Create tenant record
      const tenantResult = await client.query(`
        INSERT INTO tenants (name, subdomain, database_schema, contact_email, primary_color, secondary_color, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (subdomain) DO UPDATE SET
          name = EXCLUDED.name,
          contact_email = EXCLUDED.contact_email,
          primary_color = EXCLUDED.primary_color,
          secondary_color = EXCLUDED.secondary_color,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        tenantData.name,
        tenantData.subdomain,
        schemaName,
        tenantData.contactEmail,
        tenantData.primaryColor,
        tenantData.secondaryColor,
        tenantAdmin.id
      ]);
      
      const tenant = tenantResult.rows[0];
      
      // Create tenant schema
      await client.query('SELECT create_tenant_schema($1)', [schemaName]);
      
      // Create tenant admin user
      const tenantAdminPassword = await bcrypt.hash('Admin123!', 10);
      
      await client.query(`
        INSERT INTO ${schemaName}.users (username, email, password_hash, role_id, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          updated_at = CURRENT_TIMESTAMP
      `, [
        'admin',
        tenantData.contactEmail,
        tenantAdminPassword,
        await getRoleId(client, schemaName, 'Tenant Admin'),
        true
      ]);
      
      console.log(`   ✅ Created tenant: ${tenant.name} (${tenant.subdomain})`);
      console.log(`      📧 Admin: ${tenantData.contactEmail} / Admin123!`);
    }
    
    console.log('✅ All test tenants created\n');

    // ============= STEP 7: CREATE TENANT SETTINGS =============
    console.log('📋 Step 7: Creating tenant settings...');
    
    const tenants = await client.query('SELECT id FROM tenants');
    
    for (const tenant of tenants.rows) {
      const settings = [
        { key: 'max_users', value: '100' },
        { key: 'max_incidents', value: '1000' },
        { key: 'tenant_creation_enabled', value: 'true' },
        { key: 'auto_backup_enabled', value: 'true' }
      ];
      
      for (const setting of settings) {
        await client.query(`
          INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
          VALUES ($1, $2, $3)
          ON CONFLICT (tenant_id, setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            updated_at = CURRENT_TIMESTAMP
        `, [tenant.id, setting.key, setting.value]);
      }
    }
    
    console.log('✅ Tenant settings created\n');

    // ============= FINAL SUMMARY =============
    console.log('🎉 Database reset complete!');
    console.log('================================');
    console.log('📧 Super Admin Login:');
    console.log('   Email: admin@cas-portal.com');
    console.log('   Password: SuperAdmin123!');
    console.log('');
    console.log('👤 Tenant Admin Login:');
    console.log('   Email: tenant.admin@cas-portal.com');
    console.log('   Password: TenantAdmin123!');
    console.log('');
    console.log('🏢 Test Tenants:');
    console.log('   Custom Airport Solutions: admin@cas-nl.com / Admin123!');
    console.log('   TechCorp International: admin@techcorp.com / Admin123!');
    console.log('   Global Security Corp: admin@globalsec.com / Admin123!');
    console.log('');
    console.log('📊 Database Status:');
    console.log('   ✅ All schemas recreated');
    console.log('   ✅ All tables recreated');
    console.log('   ✅ All indexes recreated');
    console.log('   ✅ All default data inserted');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getRoleId(client, schema, roleName) {
  const result = await client.query(`SELECT id FROM ${schema}.roles WHERE name = $1`, [roleName]);
  return result.rows[0]?.id;
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await resetDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Reset failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { resetDatabase }; 