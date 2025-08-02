const { pool } = require('../config/db');

async function updateTenantSchemas() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating existing tenant schemas...\n');

    // Get all tenants
    const tenantsResult = await client.query('SELECT id, name, subdomain, database_schema FROM tenants WHERE is_active = true');
    
    for (const tenant of tenantsResult.rows) {
      console.log(`📝 Updating schema for tenant: ${tenant.name} (${tenant.subdomain})`);
      
      const schemaName = tenant.database_schema;
      
      // Update actions table to add status column if it doesn't exist
      try {
        await client.query(`
          ALTER TABLE ${schemaName}.actions 
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'
        `);
        console.log(`   ✅ Added status column to actions table`);
      } catch (error) {
        console.log(`   ⚠️  Status column already exists or error: ${error.message}`);
      }

      // Update incidents table to add KPI tracking fields if they don't exist
      const kpiFields = [
        'was_unregistered_incident BOOLEAN DEFAULT FALSE',
        'requires_escalation BOOLEAN DEFAULT FALSE',
        'escalation_reason VARCHAR(255)',
        'incorrect_diagnosis BOOLEAN DEFAULT FALSE',
        'incorrect_service_party BOOLEAN DEFAULT FALSE',
        'self_resolved_by_security BOOLEAN DEFAULT FALSE',
        'self_resolution_description TEXT',
        'estimated_downtime_minutes INTEGER',
        'actual_response_time_minutes INTEGER',
        'service_party_arrived_late BOOLEAN DEFAULT FALSE',
        'multiple_service_parties_needed BOOLEAN DEFAULT FALSE'
      ];

      for (const field of kpiFields) {
        try {
          const [fieldName] = field.split(' ');
          await client.query(`
            ALTER TABLE ${schemaName}.incidents 
            ADD COLUMN IF NOT EXISTS ${fieldName} ${field.split(' ').slice(1).join(' ')}
          `);
          console.log(`   ✅ Added ${fieldName} to incidents table`);
        } catch (error) {
          console.log(`   ⚠️  ${fieldName} already exists or error: ${error.message}`);
        }
      }

      // Update knowledge_base table to add missing fields
      try {
        await client.query(`
          ALTER TABLE ${schemaName}.knowledge_base 
          ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE
        `);
        console.log(`   ✅ Added ai_processed to knowledge_base table`);
      } catch (error) {
        console.log(`   ⚠️  ai_processed already exists or error: ${error.message}`);
      }

      // Create default categories if they don't exist
      const defaultCategories = [
        { name: 'Overig', description: 'Algemene categorie voor diverse incidenten', color: '#6B7280' },
        { name: 'Technisch', description: 'Technische problemen en storingen', color: '#3B82F6' },
        { name: 'Beveiliging', description: 'Beveiligingsincidenten en meldingen', color: '#EF4444' },
        { name: 'Faciliteiten', description: 'Facilitaire problemen en onderhoud', color: '#10B981' }
      ];

      for (const category of defaultCategories) {
        try {
          await client.query(`
            INSERT INTO ${schemaName}.categories (name, description, color)
            VALUES ($1, $2, $3)
            ON CONFLICT (name) DO NOTHING
          `, [category.name, category.description, category.color]);
          console.log(`   ✅ Added category: ${category.name}`);
        } catch (error) {
          console.log(`   ⚠️  Category ${category.name} already exists or error: ${error.message}`);
        }
      }

      // Create default locations if they don't exist
      const defaultLocations = [
        { name: 'Overig', description: 'Algemene locatie voor diverse incidenten' },
        { name: 'Hoofdgebouw', description: 'Hoofdgebouw en algemene ruimtes' },
        { name: 'Parkeerplaats', description: 'Parkeerplaatsen en externe gebieden' },
        { name: 'Technische ruimte', description: 'Technische ruimtes en serverruimtes' }
      ];

      for (const location of defaultLocations) {
        try {
          await client.query(`
            INSERT INTO ${schemaName}.locations (name, description)
            VALUES ($1, $2)
            ON CONFLICT (name) DO NOTHING
          `, [location.name, location.description]);
          console.log(`   ✅ Added location: ${location.name}`);
        } catch (error) {
          console.log(`   ⚠️  Location ${location.name} already exists or error: ${error.message}`);
        }
      }

      // Create default roles if they don't exist
      const defaultRoles = [
        {
          name: 'Tenant Admin',
          description: 'Can manage tenant settings and users',
          permissions: JSON.stringify(['all', 'users:create', 'users:read', 'users:update', 'users:delete', 'settings:read', 'settings:update'])
        },
        {
          name: 'Security Officer',
          description: 'Can manage incidents and actions',
          permissions: JSON.stringify(['incidents:create', 'incidents:read', 'incidents:update', 'actions:create', 'actions:read', 'actions:update', 'actions:delete'])
        },
        {
          name: 'Viewer',
          description: 'Can view incidents and reports',
          permissions: JSON.stringify(['incidents:read', 'actions:read', 'reports:read'])
        }
      ];

      for (const role of defaultRoles) {
        try {
          await client.query(`
            INSERT INTO ${schemaName}.roles (name, description, permissions)
            VALUES ($1, $2, $3)
            ON CONFLICT (name) DO UPDATE SET
              description = EXCLUDED.description,
              permissions = EXCLUDED.permissions
          `, [role.name, role.description, role.permissions]);
          console.log(`   ✅ Added/updated role: ${role.name}`);
        } catch (error) {
          console.log(`   ⚠️  Role ${role.name} error: ${error.message}`);
        }
      }

      console.log(`✅ Schema updated for tenant: ${tenant.name}\n`);
    }

    console.log('🎉 All tenant schemas updated successfully!');

  } catch (error) {
    console.error('❌ Error updating tenant schemas:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await updateTenantSchemas();
      process.exit(0);
    } catch (error) {
      console.error('Update failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { updateTenantSchemas }; 