import fs from 'fs';
import path from 'path';
import pool from '../config/db.ts';

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    const migrationPath = path.join(import.meta.dirname, '../db/migrations/001_init.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
