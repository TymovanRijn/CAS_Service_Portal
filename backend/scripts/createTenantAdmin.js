const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function createTenantAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🏗️  Creating Tenant Admin with Tenant Creation Rights...\n');

    // 1. Create super admin for tenant management
    console.log('👤 Creating Tenant Admin Super User...');
    
    const hashedPassword = await bcrypt.hash('TenantAdmin123!', 10);
    
    const superAdminResult = await client.query(`
      INSERT INTO super_admins (username, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE SET 
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, ['tenant_admin', 'tenant.admin@cas-portal.com', hashedPassword]);
    
    const superAdmin = superAdminResult.rows[0];
    console.log('✅ Tenant Admin Super User created:');
    console.log(`   📧 Email: ${superAdmin.email}`);
    console.log(`   🔑 Password: TenantAdmin123!`);
    console.log(`   🆔 ID: ${superAdmin.id}\n`);

    // 2. Create tenant for the tenant admin
    console.log('🏢 Creating Tenant Management Organization...');
    
    const tenantResult = await client.query(`
      INSERT INTO tenants (
        name, subdomain, database_schema, logo_path, primary_color, secondary_color,
        contact_email, contact_phone, address, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (subdomain) DO UPDATE SET
        name = EXCLUDED.name,
        primary_color = EXCLUDED.primary_color,
        secondary_color = EXCLUDED.secondary_color,
        contact_email = EXCLUDED.contact_email,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      'Tenant Management Corp',
      'tenantmgmt',
      'tenant_tenantmgmt',
      null,
      '#10B981',
      '#059669',
      'admin@tenantmgmt.com',
      '+31 6 12345678',
      'Tenant Management Street 123, 1234 AB Amsterdam',
      true,
      superAdmin.id
    ]);
    
    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant Management Organization created:');
    console.log(`   🏢 Name: ${tenant.name}`);
    console.log(`   🌐 Subdomain: ${tenant.subdomain}`);
    console.log(`   🗄️  Schema: ${tenant.database_schema}\n`);

    // 3. Create tenant schema
    console.log('📝 Creating tenant schema...');
    await client.query('SELECT create_tenant_schema($1)', [tenant.database_schema]);
    console.log('✅ Tenant schema created\n');

    // 4. Create roles in tenant schema
    console.log('👥 Creating roles in tenant schema...');
    
    const roles = [
      {
        name: 'Tenant Manager',
        description: 'Can create and manage tenants',
        permissions: JSON.stringify(['all', 'tenants:create', 'tenants:read', 'tenants:update', 'tenants:delete', 'users:create', 'users:read', 'users:update', 'users:delete'])
      },
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

    for (const role of roles) {
      await client.query(`
        INSERT INTO ${tenant.database_schema}.roles (name, description, permissions)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions
      `, [role.name, role.description, role.permissions]);
    }
    
    console.log('✅ Roles created in tenant schema\n');

    // 5. Create tenant admin user
    console.log('👤 Creating tenant admin user...');
    
    const tenantAdminPassword = await bcrypt.hash('TenantAdmin123!', 10);
    
    await client.query(`
      INSERT INTO ${tenant.database_schema}.users (username, email, password_hash, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        updated_at = CURRENT_TIMESTAMP
    `, [
      'tenant_admin',
      'admin@tenantmgmt.com',
      tenantAdminPassword,
      await getRoleId(client, tenant.database_schema, 'Tenant Manager'),
      true
    ]);
    
    console.log('✅ Tenant Admin User created:');
    console.log(`   📧 Email: admin@tenantmgmt.com`);
    console.log(`   🔑 Password: TenantAdmin123!`);
    console.log(`   👥 Role: Tenant Manager\n`);

    // 6. Create additional test users
    console.log('👥 Creating additional test users...');
    
    const testUsers = [
      {
        username: 'test_admin',
        email: 'admin@test.com',
        password: 'TestAdmin123!',
        role: 'Tenant Admin'
      },
      {
        username: 'security_officer',
        email: 'security@test.com',
        password: 'Security123!',
        role: 'Security Officer'
      },
      {
        username: 'viewer',
        email: 'viewer@test.com',
        password: 'Viewer123!',
        role: 'Viewer'
      }
    ];

    for (const user of testUsers) {
      const hashedUserPassword = await bcrypt.hash(user.password, 10);
      const roleId = await getRoleId(client, tenant.database_schema, user.role);
      
      await client.query(`
        INSERT INTO ${tenant.database_schema}.users (username, email, password_hash, role_id, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          updated_at = CURRENT_TIMESTAMP
      `, [user.username, user.email, hashedUserPassword, roleId, true]);
      
      console.log(`   ✅ ${user.username}: ${user.email} (${user.role})`);
    }

    // 7. Create tenant settings
    console.log('\n⚙️  Creating tenant settings...');
    
    const settings = [
      { key: 'max_users', value: '100' },
      { key: 'max_incidents', value: '1000' },
      { key: 'tenant_creation_enabled', value: 'true' },
      { key: 'auto_backup_enabled', value: 'true' },
      { key: 'notification_email', value: 'admin@tenantmgmt.com' }
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
    
    console.log('✅ Tenant settings created\n');

    // 8. Summary
    console.log('🎉 Tenant Admin Setup Complete!');
    console.log('================================');
    console.log('📧 Super Admin Login:');
    console.log('   Email: tenant.admin@cas-portal.com');
    console.log('   Password: TenantAdmin123!');
    console.log('');
    console.log('🏢 Tenant Login:');
    console.log('   Email: admin@tenantmgmt.com');
    console.log('   Password: TenantAdmin123!');
    console.log('   Tenant: Tenant Management Corp');
    console.log('');
    console.log('👥 Test Users:');
    console.log('   admin@test.com / TestAdmin123! (Tenant Admin)');
    console.log('   security@test.com / Security123! (Security Officer)');
    console.log('   viewer@test.com / Viewer123! (Viewer)');

  } catch (error) {
    console.error('❌ Error creating tenant admin:', error);
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
      await createTenantAdmin();
      process.exit(0);
    } catch (error) {
      console.error('Setup failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { createTenantAdmin }; 