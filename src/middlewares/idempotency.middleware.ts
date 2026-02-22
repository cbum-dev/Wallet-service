import type { Request, Response, NextFunction } from 'express';
import pool from '../config/db.ts';

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    // If no key is provided, we might fail the request depending on strictness.
    // Let's make it mandatory for POST /transact for safety.
    return res.status(400).json({ success: false, message: 'Idempotency-Key header is required' });
  }

  try {
    const client = await pool.connect();
    try {
      // 1. Check if key exists
      const result = await client.query('SELECT * FROM idempotency_keys WHERE key = $1', [idempotencyKey]);
      
      if (result.rows.length > 0) {
        // Key found! Return the cached response immediately.
        const row = result.rows[0];
        return res.status(row.response_code).json(row.response_body);
      }

      // 2. If not found, we need to intercept the response from the actual route handler.
      // We wrap res.send/json to save it before sending.
      const originalJson = res.json.bind(res);
      
      res.json = (body: any) => {
        // Only save success or specific errors as idempotent?
        // Usually we save any definitive final response (like 200, 400). Let's save all.
        client.query(
          `INSERT INTO idempotency_keys (key, response_code, response_body) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
          [idempotencyKey, res.statusCode, body]
        ).catch(err => console.error('Failed to save idempotency key:', err));

        return originalJson(body);
      };

      next();
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};
