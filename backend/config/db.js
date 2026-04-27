const { Pool, types } = require('pg');

// Return DATE columns as plain strings (e.g. "2026-04-30") instead of
// converting them to JavaScript Date objects, which causes timezone shifts.
// Without this, "2026-04-30" stored in PostgreSQL becomes "2026-04-29T22:00:00.000Z"
// in UTC+2 timezone, making April 30 display as April 29.
types.setTypeParser(1082, val => val);

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