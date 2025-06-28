const { pool } = require('../config/db');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, name, description, created_at
      FROM Categories
      ORDER BY 
        CASE WHEN name = 'Overig' THEN 0 ELSE 1 END,
        name ASC
    `);
    client.release();
    
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// Get all locations
const getLocations = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT id, name, description, created_at
      FROM Locations
      ORDER BY 
        CASE WHEN name = 'Overig' THEN 0 ELSE 1 END,
        name ASC
    `);
    client.release();
    
    res.json({ locations: result.rows });
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ message: 'Error fetching locations' });
  }
};

// Create new category
const createCategory = async (req, res) => {
  const { name, description } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Categorie naam is verplicht' });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if category already exists
    const existingCategory = await client.query(
      'SELECT id FROM Categories WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    
    if (existingCategory.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Categorie bestaat al' });
    }
    
    const result = await client.query(`
      INSERT INTO Categories (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
    `, [name.trim(), description?.trim() || null]);
    
    client.release();
    
    res.status(201).json({
      message: 'Categorie succesvol aangemaakt',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Error creating category' });
  }
};

// Update category
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Categorie naam is verplicht' });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if category exists
    const existingCategory = await client.query('SELECT id, name FROM Categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Categorie niet gevonden' });
    }
    
    // Prevent updating "Overig" category name
    if (existingCategory.rows[0].name === 'Overig' && name.trim() !== 'Overig') {
      client.release();
      return res.status(400).json({ message: 'De "Overig" categorie kan niet hernoemd worden' });
    }
    
    // Check if new name already exists (excluding current category)
    const duplicateCheck = await client.query(
      'SELECT id FROM Categories WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Categorie naam bestaat al' });
    }
    
    const result = await client.query(`
      UPDATE Categories 
      SET name = $1, description = $2
      WHERE id = $3
      RETURNING id, name, description, created_at
    `, [name.trim(), description?.trim() || null, id]);
    
    client.release();
    
    res.json({
      message: 'Categorie succesvol bijgewerkt',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Error updating category' });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Check if category exists
    const existingCategory = await client.query('SELECT id, name FROM Categories WHERE id = $1', [id]);
    if (existingCategory.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Categorie niet gevonden' });
    }
    
    // Prevent deleting "Overig" category
    if (existingCategory.rows[0].name === 'Overig') {
      client.release();
      return res.status(400).json({ message: 'De "Overig" categorie kan niet verwijderd worden' });
    }
    
    // Check if category is in use
    const usageCheck = await client.query('SELECT COUNT(*) as count FROM Incidents WHERE category_id = $1', [id]);
    const incidentCount = parseInt(usageCheck.rows[0].count);
    
    if (incidentCount > 0) {
      client.release();
      return res.status(400).json({ 
        message: `Categorie kan niet verwijderd worden. ${incidentCount} incident(en) gebruiken deze categorie.`
      });
    }
    
    await client.query('DELETE FROM Categories WHERE id = $1', [id]);
    client.release();
    
    res.json({ message: 'Categorie succesvol verwijderd' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category' });
  }
};

// Create new location
const createLocation = async (req, res) => {
  const { name, description } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Locatie naam is verplicht' });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if location already exists
    const existingLocation = await client.query(
      'SELECT id FROM Locations WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    
    if (existingLocation.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Locatie bestaat al' });
    }
    
    const result = await client.query(`
      INSERT INTO Locations (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at
    `, [name.trim(), description?.trim() || null]);
    
    client.release();
    
    res.status(201).json({
      message: 'Locatie succesvol aangemaakt',
      location: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ message: 'Error creating location' });
  }
};

// Update location
const updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ message: 'Locatie naam is verplicht' });
  }
  
  try {
    const client = await pool.connect();
    
    // Check if location exists
    const existingLocation = await client.query('SELECT id, name FROM Locations WHERE id = $1', [id]);
    if (existingLocation.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Locatie niet gevonden' });
    }
    
    // Prevent updating "Overig" location name
    if (existingLocation.rows[0].name === 'Overig' && name.trim() !== 'Overig') {
      client.release();
      return res.status(400).json({ message: 'De "Overig" locatie kan niet hernoemd worden' });
    }
    
    // Check if new name already exists (excluding current location)
    const duplicateCheck = await client.query(
      'SELECT id FROM Locations WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      client.release();
      return res.status(409).json({ message: 'Locatie naam bestaat al' });
    }
    
    const result = await client.query(`
      UPDATE Locations 
      SET name = $1, description = $2
      WHERE id = $3
      RETURNING id, name, description, created_at
    `, [name.trim(), description?.trim() || null, id]);
    
    client.release();
    
    res.json({
      message: 'Locatie succesvol bijgewerkt',
      location: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ message: 'Error updating location' });
  }
};

// Delete location
const deleteLocation = async (req, res) => {
  const { id } = req.params;
  
  try {
    const client = await pool.connect();
    
    // Check if location exists
    const existingLocation = await client.query('SELECT id, name FROM Locations WHERE id = $1', [id]);
    if (existingLocation.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Locatie niet gevonden' });
    }
    
    // Prevent deleting "Overig" location
    if (existingLocation.rows[0].name === 'Overig') {
      client.release();
      return res.status(400).json({ message: 'De "Overig" locatie kan niet verwijderd worden' });
    }
    
    // Check if location is in use
    const usageCheck = await client.query('SELECT COUNT(*) as count FROM Incidents WHERE location_id = $1', [id]);
    const incidentCount = parseInt(usageCheck.rows[0].count);
    
    if (incidentCount > 0) {
      client.release();
      return res.status(400).json({ 
        message: `Locatie kan niet verwijderd worden. ${incidentCount} incident(en) gebruiken deze locatie.`
      });
    }
    
    await client.query('DELETE FROM Locations WHERE id = $1', [id]);
    client.release();
    
    res.json({ message: 'Locatie succesvol verwijderd' });
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ message: 'Error deleting location' });
  }
};

// Ensure "Overig" categories and locations exist
const ensureDefaultEntries = async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Ensure "Overig" category exists
    await client.query(`
      INSERT INTO Categories (name, description)
      VALUES ('Overig', 'Algemene categorie voor incidenten die niet in andere categorieën passen')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Ensure "Overig" location exists
    await client.query(`
      INSERT INTO Locations (name, description)
      VALUES ('Overig', 'Algemene locatie voor incidenten zonder specifieke locatie')
      ON CONFLICT (name) DO NOTHING
    `);
    
    client.release();
    
    res.json({ message: 'Default entries ensured' });
  } catch (err) {
    console.error('Error ensuring default entries:', err);
    res.status(500).json({ message: 'Error ensuring default entries' });
  }
};

module.exports = {
  getCategories,
  getLocations,
  createCategory,
  updateCategory,
  deleteCategory,
  createLocation,
  updateLocation,
  deleteLocation,
  ensureDefaultEntries
}; 