import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.connect()
  .then(() => {
    console.log("✅ Connected to Vercel PostgreSQL");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Connection failed:", err);
    process.exit(1);
  });