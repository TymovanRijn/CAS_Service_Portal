const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'tymo2003',
  database: 'cas_service_portal',
  port: 5432,
});

async function addTestIncidents() {
  const client = await pool.connect();
  
  try {
    // Add test incidents to tenant_cas schema
    const incidents = [
      {
        title: 'Test Incident 1',
        description: 'Dit is een test incident voor de incident management',
        priority: 'Medium',
        category_id: 1,
        location_id: 1,
        created_by: 1
      },
      {
        title: 'Test Incident 2',
        description: 'Nog een test incident om de functionaliteit te testen',
        priority: 'High',
        category_id: 2,
        location_id: 2,
        created_by: 1
      },
      {
        title: 'Test Incident 3',
        description: 'Derde test incident voor de filters',
        priority: 'Low',
        category_id: 1,
        location_id: 1,
        created_by: 1
      }
    ];

    for (const incident of incidents) {
      await client.query(`
        INSERT INTO tenant_cas.incidents (
          title, description, priority, category_id, location_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        incident.title,
        incident.description,
        incident.priority,
        incident.category_id,
        incident.location_id,
        incident.created_by
      ]);
    }

    console.log('✅ Test incidents added successfully!');
    
    // Check count
    const result = await client.query('SELECT COUNT(*) FROM tenant_cas.incidents');
    console.log(`📊 Total incidents in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error adding test incidents:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addTestIncidents(); 