import fs from 'fs';
import path from 'path';
import pool from '../config/db.ts';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting seed...');
    const seedPath = path.join(import.meta.dirname, '../db/seeds/seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('Seed completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
