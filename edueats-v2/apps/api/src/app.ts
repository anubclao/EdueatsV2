import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { categoriesRouter } from './routes/categories.js';
import { healthRouter } from './routes/health.js';
import { menusRouter } from './routes/menus.js';
import { notificationsRouter } from './routes/notifications.js';
import { ordersRouter } from './routes/orders.js';
import { preferencesRouter } from './routes/preferences.js';
import { recipesRouter } from './routes/recipes.js';
import { reportsRouter } from './routes/reports.js';
import { rolesRouter } from './routes/roles.js';
import { surveysRouter } from './routes/surveys.js';
import { usersRouter } from './routes/users.js';
import { variablesRouter } from './routes/variables.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeOrigin(value: string) {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const protocol = url.protocol.toLowerCase();
    const port = url.port ? `:${url.port}` : '';
    return `${protocol}//${host}${port}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '').replace(/^www\./, '');
  }
}

export function createApp() {
  const app = express();

  const origins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(normalizeOrigin)
    : ['http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origins.includes(normalizeOrigin(origin))) return callback(null, true);
        console.error('[CORS] Origin bloqueado:', origin, 'Permitidos:', origins.join(', '));
        return callback(new Error('CORS bloqueado'));
      },
      credentials: true,
    })
  );

  app.use(express.json());

  // Serve uploaded images
  const imagesPath = path.join(__dirname, '..', '..', '..', '..', 'images');
  app.use('/images', express.static(imagesPath));

  app.use('/api/health', healthRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/recipes', recipesRouter);
  app.use('/api/menus', menusRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/surveys', surveysRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/variables', variablesRouter);
  app.use('/api/reports', reportsRouter);

  // Serve React frontend in production
  if (process.env.NODE_ENV === 'production') {
    const bundledWebDist = path.join(__dirname, 'web');
    const workspaceWebDist = path.join(__dirname, '..', '..', 'web', 'dist');
    const envWebDist = process.env.WEB_DIST_PATH
      ? path.resolve(process.cwd(), process.env.WEB_DIST_PATH)
      : null;

    // WEB_DIST_PATH tiene prioridad para que Hostinger use siempre el build fresco
    const webDistCandidates = [envWebDist, bundledWebDist, workspaceWebDist].filter(Boolean) as string[];
    const webDist = webDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));

    if (!webDist) {
      throw new Error(`No se encontro dist del frontend. Rutas probadas: ${webDistCandidates.join(', ')}`);
    }

    app.use(express.static(webDist));

    // SPA fallback — any non-API route returns index.html
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/images/')) {
        return res.status(404).json({ error: 'Not found' });
      }
      if (req.path.startsWith('/assets/') || /\.[a-zA-Z0-9]+$/.test(req.path)) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  return app;
}
