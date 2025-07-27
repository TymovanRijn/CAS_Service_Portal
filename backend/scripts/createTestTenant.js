const { createTenant, createDefaultSuperAdmin } = require('./setupMultiTenantDatabase');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function createTestTenant() {
  try {
    console.log('🧪 Creating test tenant...\n');
    
    // Ensure super admin exists
    const superAdmin = await createDefaultSuperAdmin();
    
    // Create test tenant
    const testTenant = await createTenant({
      name: 'Acme Corporation',
      subdomain: 'acme',
      contactEmail: 'admin@acme.com',
      contactPhone: '+31 20 123 4567',
      address: 'Acme Street 123, 1000 AB Amsterdam',
      primaryColor: '#2563EB',
      secondaryColor: '#1D4ED8'
    }, superAdmin.id);
    
    console.log(`✅ Test tenant created: ${testTenant.name}`);
    console.log(`📋 Schema: ${testTenant.database_schema}`);
    console.log(`🌐 Subdomain: ${testTenant.subdomain}`);
    
    // Create test tenant admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const client = await pool.connect();
    await client.query(`SET search_path TO ${testTenant.database_schema}, public`);
    
    // Get tenant admin role ID
    const roleResult = await client.query(
      "SELECT id FROM roles WHERE name = 'Tenant Admin'"
    );
    
    // Create admin user
    const adminResult = await client.query(`
      INSERT INTO users (username, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email
    `, ['admin', 'admin@acme.com', hashedPassword, roleResult.rows[0].id]);
    
    console.log(`👤 Tenant admin created: ${adminResult.rows[0].email}`);
    
    // Create some test users with different roles
    const testUsers = [
      { username: 'john.doe', email: 'john@acme.com', password: 'User123!', role: 'SAC' },
      { username: 'jane.smith', email: 'jane@acme.com', password: 'User123!', role: 'Security Officer' },
      { username: 'viewer', email: 'viewer@acme.com', password: 'User123!', role: 'Dashboard Viewer' }
    ];
    
    for (const user of testUsers) {
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE name = $1", [user.role]
      );
      
      const hashedUserPassword = await bcrypt.hash(user.password, 10);
      
      await client.query(`
        INSERT INTO users (username, email, password_hash, role_id)
        VALUES ($1, $2, $3, $4)
      `, [user.username, user.email, hashedUserPassword, roleResult.rows[0].id]);
      
      console.log(`👤 Test user created: ${user.email} (${user.role})`);
    }
    
    // Create some test incidents
    const testIncidents = [
      {
        title: 'Network connectivity issue in Terminal 1',
        description: 'Users reporting slow internet connection in Terminal 1 area',
        priority: 'High',
        category: 'Network',
        location: 'Terminal 1'
      },
      {
        title: 'Security camera malfunction at Gate A',
        description: 'Camera 3 at Gate A is not recording properly',
        priority: 'Medium',
        category: 'Security',
        location: 'Gate A'
      },
      {
        title: 'Air conditioning not working in Office Building',
        description: 'Temperature control system needs maintenance',
        priority: 'Low',
        category: 'Maintenance',
        location: 'Office Building'
      }
    ];
    
    for (const incident of testIncidents) {
      // Get category and location IDs
      const categoryResult = await client.query(
        "SELECT id FROM categories WHERE name = $1", [incident.category]
      );
      const locationResult = await client.query(
        "SELECT id FROM locations WHERE name = $1", [incident.location]
      );
      
      await client.query(`
        INSERT INTO incidents (title, description, priority, category_id, location_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        incident.title, 
        incident.description, 
        incident.priority, 
        categoryResult.rows[0].id, 
        locationResult.rows[0].id, 
        adminResult.rows[0].id
      ]);
      
      console.log(`📋 Test incident created: ${incident.title}`);
    }
    
    // Create some knowledge base articles
    const testArticles = [
      {
        title: 'How to Reset Network Equipment',
        content: 'Step-by-step guide to reset network switches and routers...',
        category: 'Network',
        tags: '["network", "troubleshooting", "reset"]'
      },
      {
        title: 'Security Camera Maintenance Checklist',
        content: 'Regular maintenance tasks for security cameras...',
        category: 'Security',
        tags: '["security", "maintenance", "cameras"]'
      }
    ];
    
    for (const article of testArticles) {
      await client.query(`
        INSERT INTO knowledge_base (title, content, category, tags, author_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        article.title,
        article.content,
        article.category,
        article.tags,
        adminResult.rows[0].id
      ]);
      
      console.log(`📚 Test article created: ${article.title}`);
    }
    
    await client.query('SET search_path TO public');
    client.release();
    
    console.log('\n🎉 Test tenant setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log('🔐 Super Admin:');
    console.log('   📧 Email: admin@cas-portal.com');
    console.log('   🔑 Password: SuperAdmin123!');
    console.log('\n🏢 Tenant: Acme Corporation (acme)');
    console.log('🔐 Tenant Admin:');
    console.log('   📧 Email: admin@acme.com');
    console.log('   🔑 Password: Admin123!');
    console.log('🔐 Test Users:');
    console.log('   📧 john@acme.com (SAC) - Password: User123!');
    console.log('   📧 jane@acme.com (Security Officer) - Password: User123!');
    console.log('   📧 viewer@acme.com (Dashboard Viewer) - Password: User123!');
    
  } catch (error) {
    console.error('❌ Error creating test tenant:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await createTestTenant();
      process.exit(0);
    } catch (error) {
      console.error('Test tenant creation failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { createTestTenant }; 