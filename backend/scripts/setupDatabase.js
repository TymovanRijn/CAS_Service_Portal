const { pool } = require('../config/db');

async function setupDatabase() {
  try {
    const client = await pool.connect();
    
    console.log('🗄️ Setting up database tables...');
    
    // Create Roles table
    console.log('👥 Creating Roles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      )
    `);
    
    // Insert default roles
    await client.query(`
      INSERT INTO Roles (name, description) 
      VALUES 
        ('SAC', 'Security Asset Coordinator - Manages incidents and coordinates asset maintenance'),
        ('Admin', 'System Administrator - Full system access and user management'),
        ('Dashboard Viewer', 'Management Dashboard Viewer - Read-only access to dashboards and reports')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Create Users table
    console.log('👤 Creating Users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id INTEGER REFERENCES Roles(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create Categories table
    console.log('🏷️ Creating Categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      )
    `);
    
    // Create Locations table
    console.log('📍 Creating Locations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      )
    `);
    
    // Create Incidents table
    console.log('🚨 Creating Incidents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Incidents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Open',
        priority VARCHAR(20) DEFAULT 'Medium',
        possible_solution TEXT,
        category_id INTEGER REFERENCES Categories(id),
        location_id INTEGER REFERENCES Locations(id),
        created_by INTEGER REFERENCES Users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- SAC KPI Tracking Fields
        was_unregistered_incident BOOLEAN DEFAULT FALSE,
        requires_escalation BOOLEAN DEFAULT FALSE,
        escalation_reason VARCHAR(255),
        incorrect_diagnosis BOOLEAN DEFAULT FALSE,
        incorrect_service_party BOOLEAN DEFAULT FALSE,
        self_resolved_by_sac BOOLEAN DEFAULT FALSE,
        self_resolution_description TEXT,
        estimated_downtime_minutes INTEGER,
        actual_response_time_minutes INTEGER,
        service_party_arrived_late BOOLEAN DEFAULT FALSE,
        multiple_service_parties_needed BOOLEAN DEFAULT FALSE
      )
    `);
    
    // Add columns to existing table if they don't exist
    await client.query(`
      ALTER TABLE Incidents 
      ADD COLUMN IF NOT EXISTS was_unregistered_incident BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS requires_escalation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS escalation_reason VARCHAR(255),
      ADD COLUMN IF NOT EXISTS incorrect_diagnosis BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS incorrect_service_party BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS self_resolved_by_sac BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS self_resolution_description TEXT,
      ADD COLUMN IF NOT EXISTS estimated_downtime_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS actual_response_time_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS service_party_arrived_late BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS multiple_service_parties_needed BOOLEAN DEFAULT FALSE
    `);
    
    // Create Actions table
    console.log('⚡ Creating Actions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS Actions (
        id SERIAL PRIMARY KEY,
        incident_id INTEGER REFERENCES Incidents(id),
        action_description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        assigned_to INTEGER REFERENCES Users(id),
        created_by INTEGER REFERENCES Users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create IncidentAttachments table
    console.log('📎 Creating IncidentAttachments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS IncidentAttachments (
        id SERIAL PRIMARY KEY,
        incident_id INTEGER REFERENCES Incidents(id),
        file_path VARCHAR(500),
        original_name VARCHAR(255),
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create BakInventory table
    console.log('📦 Creating BakInventory table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS BakInventory (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES Locations(id),
        current_stock INTEGER DEFAULT 0,
        last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create AuditLogs table
    console.log('📋 Creating AuditLogs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS AuditLogs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES Users(id),
        action VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create KPIRecords table
    console.log('📊 Creating KPIRecords table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS KPIRecords (
        id SERIAL PRIMARY KEY,
        kpi_name VARCHAR(100),
        value DECIMAL(10,2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    console.log('🔍 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON Incidents(created_at);
      CREATE INDEX IF NOT EXISTS idx_incidents_status ON Incidents(status);
      CREATE INDEX IF NOT EXISTS idx_actions_status ON Actions(status);
      CREATE INDEX IF NOT EXISTS idx_actions_assigned_to ON Actions(assigned_to);
    `);
    
    console.log('✅ Database setup completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('- Roles (with default roles)');
    console.log('- Users');
    console.log('- Categories');
    console.log('- Locations');
    console.log('- Incidents');
    console.log('- Actions');
    console.log('- IncidentAttachments');
    console.log('- BakInventory');
    console.log('- AuditLogs');
    console.log('- KPIRecords');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: node scripts/createTestUsers.js');
    console.log('2. Run: node scripts/createTestData.js');
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up database:', err.message);
    process.exit(1);
  }
}

setupDatabase(); 