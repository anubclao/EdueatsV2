import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../db/pool.js';
import { getQueueStatus } from '../services/queue.js';
import { getConnectedUsersCount } from '../services/websocket.js';

export const healthRouter = Router();

/**
 * TEMPORARY debug endpoint to diagnose the IMAGES_PATH issue.
 * Logs (server side) every candidate path it can think of so we can
 * see where the images directory actually is on Hostinger. Safe to
 * leave in for now (returns no secrets) — delete after the IMAGES_PATH
 * is confirmed working.
 *
 * GET /api/health/debug-images
 */
healthRouter.get('/debug-images', async (_req, res) => {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const candidates = {
    env_IMAGES_PATH: process.env.IMAGES_PATH || null,
    cwd: process.cwd(),
    dirname: __dirname,
    resolved_from_env: process.env.IMAGES_PATH
      ? path.resolve(process.cwd(), process.env.IMAGES_PATH)
      : null,
    walk_up_4: path.join(__dirname, '..', '..', '..', '..', 'images'),
    walk_up_5: path.join(__dirname, '..', '..', '..', '..', '..', 'images'),
    walk_up_6: path.join(__dirname, '..', '..', '..', '..', '..', '..', 'images'),
  };

  const result = {};
  for (const [label, p] of Object.entries(candidates)) {
    if (!p) {
      result[label] = { path: null, exists: false };
      continue;
    }
    try {
      const stat = fs.statSync(p);
      let entries = null;
      if (stat.isDirectory()) {
        try { entries = fs.readdirSync(p).slice(0, 30); } catch {}
      }
      result[label] = {
        path: p,
        exists: true,
        isDirectory: stat.isDirectory(),
        entries,
      };
    } catch (err: any) {
      result[label] = {
        path: p,
        exists: false,
        error: err?.code || err?.message,
      };
    }
  }

  // Also: list every env var that mentions 'IMAGES', 'STORAGE', 'PATH' or
  // 'HOME' so we can spot the storage location name.
  const storageHints: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/IMAGE|STORAGE|HOME|PATH|UPLOAD/i.test(k)) {
      storageHints[k] = v;
    }
  }

  console.log('[debug-images] candidates:', JSON.stringify(result, null, 2));
  console.log('[debug-images] storage hints:', JSON.stringify(storageHints, null, 2));

  res.json({
    candidates: result,
    storageHints,
    note: 'Check the server log for [debug-images] entries — they show every path tried and what was found.',
  });
});

healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok', service: 'api', uptimeSec: Math.floor(process.uptime()) });
});

healthRouter.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    const queue = await getQueueStatus();
    res.json({
      status: 'ready',
      db: 'mysql',
      dbConnection: 'ready',
      queue,
      websocketConnectedUsers: getConnectedUsersCount(),
    });
  } catch (error) {
    console.error('[health:ready] DB check failed:', error);
    res.status(503).json({ status: 'not_ready', db: 'mysql', dbConnection: 'error' });
  }
});

healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    const queue = await getQueueStatus();
    res.json({
      status: 'ok',
      db: 'mysql',
      dbConnection: 'ready',
      queue,
      websocketConnectedUsers: getConnectedUsersCount(),
    });
  } catch (error) {
    console.error('[health] DB check failed:', error);
    res.status(500).json({ status: 'degraded', db: 'mysql', dbConnection: 'error' });
  }
});
