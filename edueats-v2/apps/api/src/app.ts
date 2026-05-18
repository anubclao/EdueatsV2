import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { RedisRateLimitStore } from './middleware/redis-rate-limit-store.js';
import { getSessionMiddleware } from './middleware/sessions.js';
import { categoriesRouter } from './routes/categories.js';
import { chatbotRouter } from './routes/chatbot.js';
import { categoryRulesRouter } from './routes/category-rules.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
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

  // ── Seguridad: headers HTTP ──────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // ── Rate limiting global: 200 req / min por IP (con Redis/fallback) ──────
  const globalLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, intenta en un momento.' },
    store: new RedisRateLimitStore(),
  });
  app.use('/api/', globalLimiter);

  // ── Rate limiting estricto en auth: 10 req / 15 min por IP (con Redis) ──
  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: 10,
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta en 15 minutos.' },
    store: new RedisRateLimitStore(),
  });
  app.use('/api/users/register', authLimiter);
  app.use('/api/users/verify', authLimiter);
  app.use('/api/users/resend-verification', authLimiter);
  app.use('/api/auth/start', authLimiter);
  app.use('/api/auth/verify-otp', authLimiter);

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

  app.use(express.json({ limit: '50kb' }));

  // ── Sesiones distribuidas con Redis (multi-instancia) ──────────────────
  app.use(getSessionMiddleware());

  // Serve uploaded images
  const imagesPath = path.join(__dirname, '..', '..', '..', '..', 'images');
  app.use('/images', express.static(imagesPath));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/category-rules', categoryRulesRouter);
  app.use('/api/recipes', recipesRouter);
  app.use('/api/menus', menusRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/surveys', surveysRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/variables', variablesRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/chatbot', chatbotRouter);

  // Serve React frontend — sirve el dist si existe (independiente de NODE_ENV)
  const bundledWebDist = path.join(__dirname, 'web');
  const workspaceWebDist = path.join(__dirname, '..', '..', 'web', 'dist');
  const envWebDist = process.env.WEB_DIST_PATH
    ? path.resolve(process.cwd(), process.env.WEB_DIST_PATH)
    : null;

  // WEB_DIST_PATH tiene prioridad para que Hostinger use siempre el build fresco
  const webDistCandidates = [envWebDist, bundledWebDist, workspaceWebDist].filter(Boolean) as string[];
  const webDist = webDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));

  if (!webDist) {
    console.warn(
      `[startup] No se encontro dist del frontend. Rutas probadas: ${webDistCandidates.join(', ')}`
    );
  } else {
    console.log(`[startup] Sirviendo frontend desde: ${webDist}`);
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
