import type { Request, Response, NextFunction } from 'express';
import pool from '../config/db.ts';

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return res.status(400).json({ success: false, message: 'Idempotency-Key header is required' });
  }

  try {
    const result = await pool.query('SELECT * FROM idempotency_keys WHERE key = $1', [idempotencyKey]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return res.status(row.response_code).json(row.response_body);
    }

    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      pool.query(
        `INSERT INTO idempotency_keys (key, response_code, response_body) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
        [idempotencyKey, res.statusCode, body]
      ).catch(err => console.error('Failed to save idempotency key:', err));

      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};
