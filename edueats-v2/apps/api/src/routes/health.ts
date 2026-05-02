import { Router } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok', service: 'api', uptimeSec: Math.floor(process.uptime()) });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', db: 'mysql', dbConnection: 'ready' });
  } catch (error) {
    console.error('[health:ready] DB check failed:', error);
    res.status(503).json({ status: 'not_ready', db: 'mysql', dbConnection: 'error' });
  }
});

healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'mysql', dbConnection: 'ready' });
  } catch (error) {
    console.error('[health] DB check failed:', error);
    res.status(500).json({ status: 'degraded', db: 'mysql', dbConnection: 'error' });
  }
});
