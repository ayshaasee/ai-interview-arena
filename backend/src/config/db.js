import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// A connection POOL, not a single connection — Express handles many
// requests concurrently, so we need many DB connections available at
// once rather than queuing every request behind one connection.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Render/most hosted Postgres requires SSL in production but not locally.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

export default pool;