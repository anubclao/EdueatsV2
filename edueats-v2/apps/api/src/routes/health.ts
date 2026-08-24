import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../db/pool.js';
import { getQueueStatus } from '../services/queue.js';
import { getConnectedUsersCount } from '../services/websocket.js';

export const healthRouter = Router();

/**
 * TEMPORARY debug endpoint to locate the images directory from Node's
 * perspective. Re-introduced 2026-08-24 because the env-var path resolved
 * to a non-existent directory while the file-manager showed the files.
 * Logs and returns:
 *   - every candidate path we try (env, cwd-relative, walk-ups)
 *   - the first existing ancestor of each candidate
 *   - the result of a bounded recursive search under /home/u652436213 for
 *     any directory named "images" that contains "general"
 *   - every env var that mentions IMAGE / HOME / PWD / PATH / HBUILD /
 *     DOMAIN / PUBLIC so we can spot the storage bucket name
 *
 * DELETE THIS ENDPOINT after the real path is wired in via IMAGES_PATH.
 */
healthRouter.get('/debug-images', async (_req, res) => {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const tried: Record<string, string | null> = {
    env_IMAGES_PATH_raw: process.env.IMAGES_PATH || null,
    env_IMAGES_PATH_resolved: process.env.IMAGES_PATH
      ? path.resolve(process.cwd(), process.env.IMAGES_PATH)
      : null,
    cwd: process.cwd(),
    dirname: here,
    walk_up_4: path.join(here, '..', '..', '..', '..', 'images'),
    walk_up_5: path.join(here, '..', '..', '..', '..', '..', 'images'),
    walk_up_6: path.join(here, '..', '..', '..', '..', '..', '..', 'images'),
    walk_up_7: path.join(here, '..', '..', '..', '..', '..', '..', '..', 'images'),
  };

  const existence: Record<string, any> = {};
  for (const [label, p] of Object.entries(tried)) {
    if (!p) { existence[label] = { path: null, exists: false }; continue; }
    try {
      const stat = fs.statSync(p);
      existence[label] = { path: p, exists: true, isDirectory: stat.isDirectory() };
    } catch (err: any) {
      existence[label] = { path: p, exists: false, error: err?.code || err?.message };
    }
  }

  // Bounded search: walk /home/u652436213 up to depth 4 looking for a
  // directory called "images" with a "general" subdir inside.
  const foundDirs: string[] = [];
  function boundedFind(dir: string, depth: number) {
    if (depth > 4 || foundDirs.length > 10) return;
    let entries: string[];
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const e of entries) {
      if (foundDirs.length > 10) return;
      const full = path.join(dir, e);
      let st;
      try { st = fs.statSync(full); } catch { continue; }
      if (!st.isDirectory()) continue;
      if (e === 'images') {
        try {
          const sub = fs.readdirSync(full);
          if (sub.includes('general')) {
            foundDirs.push(full);
          }
        } catch {}
      }
      boundedFind(full, depth + 1);
    }
  }
  boundedFind('/home/u652436213', 0);

  // Also probe a few Hostinger-typical prefixes that may not be under /home.
  const typicalPrefixes = [
    '/var/www', '/var/www/html', '/srv', '/opt', '/storage',
    '/home', '/tmp', '/nodejs', '/app',
  ];
  const prefixExistence: Record<string, boolean> = {};
  for (const p of typicalPrefixes) {
    try { fs.statSync(p); prefixExistence[p] = true; } catch { prefixExistence[p] = false; }
  }

  // Env hints (filter only relevant ones to keep the log scannable).
  const hints: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/IMAGE|HOME|PWD|HBUILD|DOMAIN|PUBLIC|STORAGE|APP|HOSTINGER|VERSION/i.test(k)) {
      hints[k] = v;
    }
  }

  const result = { tried, existence, foundDirs, prefixExistence, hints };
  console.log('[debug-images]', JSON.stringify(result, null, 2));
  res.json(result);
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
