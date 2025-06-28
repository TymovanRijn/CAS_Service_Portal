const { pool } = require('../config/db');

async function createTestData() {
  try {
    const client = await pool.connect();
    
    console.log('🚀 Creating test data...');
    
    // Check if we already have test data
    const existingIncidents = await client.query('SELECT COUNT(*) as count FROM Incidents');
    if (parseInt(existingIncidents.rows[0].count) > 0) {
      console.log('📊 Test data already exists, skipping creation...');
      client.release();
      return;
    }
    
    // Create Categories (including "Overig")
    console.log('📁 Creating categories...');
    try {
      await client.query(`INSERT INTO Categories (name, description) VALUES ('Overig', 'Algemene categorie voor incidenten die niet in andere categorieën passen') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Categories (name, description) VALUES ('Technical', 'Technische storingen en problemen') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Categories (name, description) VALUES ('Security', 'Beveiligingsgerelateerde incidenten') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Categories (name, description) VALUES ('Maintenance', 'Onderhoud en reparaties') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Categories (name, description) VALUES ('Operational', 'Operationele verstoringen') ON CONFLICT (name) DO NOTHING`);
    } catch (err) {
      if (!err.message.includes('duplicate key')) {
        throw err;
      }
    }
    
    // Create Locations (including "Overig")
    console.log('📍 Creating locations...');
    try {
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Overig', 'Algemene locatie voor incidenten zonder specifieke locatie') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Terminal 1', 'Hoofdterminal voor binnenlandse vluchten') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Terminal 2', 'Internationale vertrekhal') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Gate A1', 'Gate A1 - Security Lane 1') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Gate A2', 'Gate A2 - Security Lane 2') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Gate B1', 'Gate B1 - Security Lane 3') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Central Security', 'Centrale beveiligingspost') ON CONFLICT (name) DO NOTHING`);
      await client.query(`INSERT INTO Locations (name, description) VALUES ('Baggage Hall', 'Bagagehal') ON CONFLICT (name) DO NOTHING`);
    } catch (err) {
      if (!err.message.includes('duplicate key')) {
        throw err;
      }
    }
    
    // Get category and location IDs
    const categoriesResult = await client.query('SELECT id, name FROM Categories');
    const locationsResult = await client.query('SELECT id, name FROM Locations');
    const usersResult = await client.query('SELECT id, username FROM Users');
    
    const categoriesMap = categoriesResult.rows;
    const locationsMap = locationsResult.rows;
    const users = usersResult.rows;
    
    if (users.length === 0) {
      console.log('❌ No users found. Please run createTestUsers.js first');
      client.release();
      return;
    }
    
    // Create some test incidents
    console.log('🚨 Creating test incidents...');
    const incidents = [
      {
        title: 'CT Scanner Lane 1 Offline',
        description: 'CT scanner op lane 1 geeft foutmelding en is niet operationeel. Passagiers moeten omgeleid worden.',
        priority: 'High',
        category: 'Technical',
        location: 'Gate A1'
      },
      {
        title: 'Baggage Belt Storing',
        description: 'Bagageband loopt vast bij gate B1, handmatige afhandeling nodig.',
        priority: 'Medium',
        category: 'Technical',
        location: 'Gate B1'
      },
      {
        title: 'Security Alert Terminal 2',
        description: 'Verdachte bagage gedetecteerd bij security checkpoint, EOD team ingeschakeld.',
        priority: 'High',
        category: 'Security',
        location: 'Terminal 2'
      },
      {
        title: 'Klimaatinstallatie Defect',
        description: 'Airco in centrale hal werkt niet, temperatuur stijgt.',
        priority: 'Low',
        category: 'Maintenance',
        location: 'Central Security'
      },
      {
        title: 'Personeel Tekort Gate A2',
        description: 'Door ziekte personeel tekort bij gate A2, langere wachttijden.',
        priority: 'Medium',
        category: 'Operational',
        location: 'Gate A2'
      }
    ];
    
    for (const incident of incidents) {
      const category = categoriesMap.find(c => c.name === incident.category);
      const location = locationsMap.find(l => l.name === incident.location);
      const user = users[Math.floor(Math.random() * users.length)];
      
      const result = await client.query(`
        INSERT INTO Incidents (title, description, status, priority, category_id, location_id, created_by, possible_solution)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        incident.title,
        incident.description,
        Math.random() > 0.3 ? 'Open' : 'In Progress',
        incident.priority,
        category?.id,
        location?.id,
        user.id,
        'Onderzoek naar oorzaak gaande, service team ingeschakeld.'
      ]);
      
      const incidentId = result.rows[0].id;
      
      // Create some actions for each incident
      const actions = [
        'Service team contacteren voor diagnose',
        'Alternatieve route voor passagiers organiseren',
        'Reserveonderdelen bestellen',
        'Technische documentatie raadplegen',
        'Management informeren over status'
      ];
      
      // Create 1-3 actions per incident
      const numActions = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numActions; i++) {
        const actionDescription = actions[Math.floor(Math.random() * actions.length)];
        const assignedUser = Math.random() > 0.5 ? users[Math.floor(Math.random() * users.length)] : null;
        
        await client.query(`
          INSERT INTO Actions (incident_id, action_description, status, assigned_to, created_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          incidentId,
          actionDescription,
          Math.random() > 0.4 ? 'Pending' : 'In Progress',
          assignedUser?.id,
          user.id
        ]);
      }
    }
    
    // Create some older incidents (not today) for better statistics
    console.log('📊 Creating historical incidents...');
    for (let i = 0; i < 10; i++) {
      const category = categoriesMap[Math.floor(Math.random() * categoriesMap.length)];
      const location = locationsMap[Math.floor(Math.random() * locationsMap.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      // Create incidents from 1-7 days ago
      const daysAgo = Math.floor(Math.random() * 7) + 1;
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - daysAgo);
      
      await client.query(`
        INSERT INTO Incidents (title, description, status, priority, category_id, location_id, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        `Historical Issue ${i + 1}`,
        `Dit is een historisch incident voor test doeleinden.`,
        Math.random() > 0.7 ? 'Closed' : 'Open',
        ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        category.id,
        location.id,
        user.id,
        createdDate,
        createdDate
      ]);
    }
    
    console.log('✅ Test data created successfully!');
    console.log('');
    console.log('Created:');
    console.log('- Categories and Locations');
    console.log('- 5 current incidents with actions');
    console.log('- 10 historical incidents');
    console.log('');
    console.log('You can now test the dashboard with real data!');
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test data:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

createTestData(); 