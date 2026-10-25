import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create a connection pool to manage multiple concurrent database requests efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for cloud Postgres providers like Neon/Render
  },
});

// Startup connection test
export const connectPostgres = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`PostgreSQL Connected successfully at: ${res.rows[0].now}`);
    client.release(); // Always release the borrowed client back into the pool!
  } catch (error) {
    console.error('PostgreSQL Connection Error:', error.message);
    process.exit(1);
  }
};

// Helper function for single parameterized SQL queries
export const query = (text, params) => pool.query(text, params);

// Export pool itself for multi-step ACID transactions (BEGIN ... COMMIT)
export default pool;