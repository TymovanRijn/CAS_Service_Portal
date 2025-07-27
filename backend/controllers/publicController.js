const { pool } = require('../config/db');

// Get public tenant information for login page
const getPublicTenants = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        id,
        name,
        subdomain,
        logo_path,
        primary_color,
        secondary_color
      FROM tenants 
      WHERE is_active = true
      ORDER BY name ASC
    `);
    client.release();
    
    res.json({ 
      tenants: result.rows.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        logo_path: tenant.logo_path,
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        is_active: true
      }))
    });
  } catch (err) {
    console.error('Get public tenants error:', err);
    res.status(500).json({ message: 'Error fetching tenant information' });
  }
};

module.exports = {
  getPublicTenants
}; 