import { Router } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'mysql', dbConnection: 'ready' });
  } catch {
    res.status(500).json({ status: 'degraded', db: 'mysql', dbConnection: 'error' });
  }
});
