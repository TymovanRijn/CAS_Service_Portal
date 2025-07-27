const { Pool } = require('pg');

// Database connection for superuser operations
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cas_service_portal',
  password: process.env.DB_PASSWORD || 'tymo2003',
  port: process.env.DB_PORT || 5432,
});

async function setupMultiTenantDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🏗️  Setting up Multi-Tenant Database Architecture...\n');

    // ============= CORE TABLES (SHARED) =============
    console.log('📋 Creating Core/Shared Tables...');

    // Super Admin Users table
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

    // Tenants table
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

    // Tenant Settings table
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

    console.log('✅ Core tables created successfully!\n');

    // ============= TENANT SCHEMA TEMPLATE =============
    console.log('📝 Creating tenant schema template functions...');

    // Function to create a new tenant schema
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
          name VARCHAR(100) NOT NULL,
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
          name VARCHAR(100) NOT NULL,
          description TEXT,
          color VARCHAR(7) DEFAULT ''#6B7280'',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create Locations table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.locations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
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
        
        -- Create BakInventory table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.bak_inventory (
          id SERIAL PRIMARY KEY,
          location_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.locations(id),
          current_stock INTEGER DEFAULT 0,
          last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create AuditLogs table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES ' || quote_ident(schema_name) || '.users(id),
          action VARCHAR(255),
          details JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create KPIRecords table
        EXECUTE 'CREATE TABLE IF NOT EXISTS ' || quote_ident(schema_name) || '.kpi_records (
          id SERIAL PRIMARY KEY,
          kpi_name VARCHAR(100),
          value DECIMAL(10,2),
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )';
        
        -- Create indexes for performance
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || schema_name || '_incidents_created_at ON ' || quote_ident(schema_name) || '.incidents(created_at)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || schema_name || '_incidents_status ON ' || quote_ident(schema_name) || '.incidents(status)';
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
          (''Technical'', ''Technical issues and IT problems'', ''#3B82F6''),
          (''Security'', ''Security incidents and breaches'', ''#EF4444''),
          (''Maintenance'', ''Maintenance and facility issues'', ''#F59E0B''),
          (''Network'', ''Network connectivity and infrastructure'', ''#10B981''),
          (''Other'', ''Other miscellaneous issues'', ''#6B7280'')
        ON CONFLICT DO NOTHING';
        
        -- Insert default locations
        EXECUTE 'INSERT INTO ' || quote_ident(schema_name) || '.locations (name, description) VALUES 
          (''Terminal 1'', ''Main terminal building''),
          (''Terminal 2'', ''Secondary terminal building''),
          (''Gate A'', ''Gate A area''),
          (''Gate B'', ''Gate B area''),
          (''Parking'', ''Parking facilities''),
          (''Office Building'', ''Administrative offices'')
        ON CONFLICT DO NOTHING';
        
        -- Reset search path
        EXECUTE 'SET search_path TO public';
        
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Tenant schema template function created!\n');

    // Create indexes on core tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
      CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
      CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add triggers for updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
      CREATE TRIGGER update_tenants_updated_at
        BEFORE UPDATE ON tenants
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
      DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON tenant_settings;
      CREATE TRIGGER update_tenant_settings_updated_at
        BEFORE UPDATE ON tenant_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('🎉 Multi-Tenant Database Architecture Setup Complete!\n');
    console.log('📋 Created:');
    console.log('   ✓ Core tables: super_admins, tenants, tenant_settings');
    console.log('   ✓ Tenant schema creation function');
    console.log('   ✓ Indexes and triggers');
    console.log('   ✓ Default data templates\n');
    console.log('🚀 Ready to create tenant instances!');

  } catch (error) {
    console.error('❌ Error setting up multi-tenant database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to create a new tenant with complete setup
async function createTenant(tenantData, superAdminId) {
  const client = await pool.connect();
  
  try {
    const { name, subdomain, contactEmail, contactPhone, address, primaryColor, secondaryColor } = tenantData;
    const schemaName = `tenant_${subdomain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    console.log(`🏢 Creating new tenant: ${name} (${subdomain})`);
    
    // Insert tenant record
    const tenantResult = await client.query(`
      INSERT INTO tenants (name, subdomain, database_schema, contact_email, contact_phone, address, primary_color, secondary_color, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [name, subdomain, schemaName, contactEmail, contactPhone, address, primaryColor || '#3B82F6', secondaryColor || '#1E40AF', superAdminId]);
    
    const tenant = tenantResult.rows[0];
    
    // Create tenant schema with all tables
    await client.query('SELECT create_tenant_schema($1)', [schemaName]);
    
    console.log(`✅ Tenant "${name}" created successfully with schema "${schemaName}"`);
    return tenant;
    
  } catch (error) {
    console.error('❌ Error creating tenant:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Function to create default super admin
async function createDefaultSuperAdmin() {
  const bcrypt = require('bcrypt');
  const client = await pool.connect();
  
  try {
    // Check if super admin already exists
    const existing = await client.query('SELECT id FROM super_admins WHERE email = $1', ['admin@cas-portal.com']);
    
    if (existing.rows.length > 0) {
      console.log('ℹ️  Default super admin already exists');
      return existing.rows[0];
    }
    
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
    
    const result = await client.query(`
      INSERT INTO super_admins (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING *
    `, ['superadmin', 'admin@cas-portal.com', hashedPassword]);
    
    console.log('✅ Default super admin created:');
    console.log('   📧 Email: admin@cas-portal.com');
    console.log('   🔑 Password: SuperAdmin123!');
    
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  setupMultiTenantDatabase,
  createTenant,
  createDefaultSuperAdmin,
  pool
};

// Run setup if called directly
// Export functions for use in other scripts
module.exports = setupMultiTenantDatabase;

if (require.main === module) {
  (async () => {
    try {
      await setupMultiTenantDatabase();
      await createDefaultSuperAdmin();
      process.exit(0);
    } catch (error) {
      console.error('Setup failed:', error);
      process.exit(1);
    }
  })();
} 