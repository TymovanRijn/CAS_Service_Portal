const { pool } = require('../config/db');

async function addOverigEntries() {
  try {
    const client = await pool.connect();
    
    console.log('🔧 Adding "Overig" default entries...');
    
    // Add "Overig" category
    console.log('📁 Adding "Overig" category...');
    await client.query(`
      INSERT INTO Categories (name, description)
      VALUES ('Overig', 'Algemene categorie voor incidenten die niet in andere categorieën passen')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Add "Overig" location
    console.log('📍 Adding "Overig" location...');
    await client.query(`
      INSERT INTO Locations (name, description)
      VALUES ('Overig', 'Algemene locatie voor incidenten zonder specifieke locatie')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Check if entries were added
    const categoryCheck = await client.query("SELECT id FROM Categories WHERE name = 'Overig'");
    const locationCheck = await client.query("SELECT id FROM Locations WHERE name = 'Overig'");
    
    console.log('✅ "Overig" entries added successfully!');
    console.log(`📁 Category "Overig" ID: ${categoryCheck.rows[0]?.id || 'Already existed'}`);
    console.log(`📍 Location "Overig" ID: ${locationCheck.rows[0]?.id || 'Already existed'}`);
    console.log('');
    console.log('These default entries cannot be deleted and provide fallback options for incidents.');
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding "Overig" entries:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

addOverigEntries(); 