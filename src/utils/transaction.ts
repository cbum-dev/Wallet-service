import type { PoolClient } from 'pg';
import pool from '../config/db.ts';

/**
 * Wraps an operation in a database transaction.
 * @param callback Function to execute within the transaction. Receives a client.
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
