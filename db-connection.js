import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * The PostgreSQL connection pool.
 */
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});