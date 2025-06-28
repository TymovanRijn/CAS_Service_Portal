const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cas_service_portal',
  password: 'tymo2003',
  port: 5432,
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection error', err);
    process.exit(1);
  }
};

module.exports = { connectDB, pool }; 