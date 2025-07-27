const fs = require('fs');
const path = require('path');

// Controllers that should be tenant-aware
const tenantAwareControllers = [
  'actionController.js',
  'incidentController.js',
  'categoryController.js',
  'userController.js'
];

// Functions that should remain global (super admin, auth, public)
const globalControllers = [
  'authController.js',
  'superAdminController.js', 
  'publicController.js',
  'aiController.js',
  'reportController.js'
];

async function fixController(controllerPath) {
  console.log(`🔧 Fixing ${path.basename(controllerPath)}...`);
  
  let content = fs.readFileSync(controllerPath, 'utf8');
  
  // Replace pool.connect() with getTenantConnection() for tenant-aware controllers
  if (tenantAwareControllers.includes(path.basename(controllerPath))) {
    // Add tenant context check before pool.connect()
    content = content.replace(
      /const client = await pool\.connect\(\);/g,
      `if (!req.tenant) {
      return res.status(400).json({ message: 'Tenant context required' });
    }
    
    const client = await getTenantConnection(req.tenant.schema);`
    );
    
    // Fix table names - change from capitalized to lowercase
    const tableReplacements = {
      'FROM Users': 'FROM users',
      'FROM Incidents': 'FROM incidents', 
      'FROM Actions': 'FROM actions',
      'FROM Categories': 'FROM categories',
      'FROM Locations': 'FROM locations',
      'FROM Roles': 'FROM roles',
      'JOIN Users': 'JOIN users',
      'JOIN Incidents': 'JOIN incidents',
      'JOIN Actions': 'JOIN actions', 
      'JOIN Categories': 'JOIN categories',
      'JOIN Locations': 'JOIN locations',
      'JOIN Roles': 'JOIN roles',
      'LEFT JOIN Users': 'LEFT JOIN users',
      'LEFT JOIN Incidents': 'LEFT JOIN incidents',
      'LEFT JOIN Actions': 'LEFT JOIN actions',
      'LEFT JOIN Categories': 'LEFT JOIN categories',
      'LEFT JOIN Locations': 'LEFT JOIN locations',
      'LEFT JOIN Roles': 'LEFT JOIN roles',
      'RIGHT JOIN Users': 'RIGHT JOIN users',
      'RIGHT JOIN Incidents': 'RIGHT JOIN incidents',
      'RIGHT JOIN Actions': 'RIGHT JOIN actions',
      'RIGHT JOIN Categories': 'RIGHT JOIN categories',
      'RIGHT JOIN Locations': 'RIGHT JOIN locations',
      'RIGHT JOIN Roles': 'RIGHT JOIN roles',
      'INSERT INTO Users': 'INSERT INTO users',
      'INSERT INTO Incidents': 'INSERT INTO incidents',
      'INSERT INTO Actions': 'INSERT INTO actions',
      'INSERT INTO Categories': 'INSERT INTO categories',
      'INSERT INTO Locations': 'INSERT INTO locations',
      'INSERT INTO Roles': 'INSERT INTO roles',
      'UPDATE Users': 'UPDATE users',
      'UPDATE Incidents': 'UPDATE incidents',
      'UPDATE Actions': 'UPDATE actions',
      'UPDATE Categories': 'UPDATE categories',
      'UPDATE Locations': 'UPDATE locations',
      'UPDATE Roles': 'UPDATE roles',
      'DELETE FROM Users': 'DELETE FROM users',
      'DELETE FROM Incidents': 'DELETE FROM incidents',
      'DELETE FROM Actions': 'DELETE FROM actions',
      'DELETE FROM Categories': 'DELETE FROM categories',
      'DELETE FROM Locations': 'DELETE FROM locations',
      'DELETE FROM Roles': 'DELETE FROM roles'
    };
    
    for (const [oldTable, newTable] of Object.entries(tableReplacements)) {
      content = content.replace(new RegExp(oldTable, 'g'), newTable);
    }
    
    // Make sure getTenantConnection is imported
    if (!content.includes('getTenantConnection')) {
      content = content.replace(
        "const { pool } = require('../config/db');",
        "const { pool } = require('../config/db');\nconst { getTenantConnection } = require('../middleware/tenantMiddleware');"
      );
    }
  }
  
  fs.writeFileSync(controllerPath, content);
  console.log(`✅ Fixed ${path.basename(controllerPath)}`);
}

async function main() {
  console.log('🔧 Fixing all controllers to be tenant-aware...\n');
  
  const controllersDir = path.join(__dirname, '../controllers');
  
  for (const controller of tenantAwareControllers) {
    const controllerPath = path.join(controllersDir, controller);
    if (fs.existsSync(controllerPath)) {
      await fixController(controllerPath);
    }
  }
  
  console.log('\n🎉 All controllers fixed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixController }; 