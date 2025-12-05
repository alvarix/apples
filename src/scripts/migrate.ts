import { pool, query } from '../db/connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    console.log('Starting migration...');

    // Check if type column exists
    const checkColumn = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='transactions' AND column_name='type'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding type column to existing transactions...');
      await query(`
        ALTER TABLE transactions
        ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'expense'
      `);

      // Add constraint separately (needed for existing tables)
      await query(`
        ALTER TABLE transactions
        ADD CONSTRAINT transactions_type_check CHECK (type IN ('expense', 'settlement'))
      `);

      console.log('Type column added successfully');
    } else {
      console.log('Type column already exists');
    }

    console.log('Migration completed successfully');
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
