import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distCandidates = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, 'dist'),
];
const clientDistPath = distCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
const clientIndexPath = clientDistPath ? path.join(clientDistPath, 'index.html') : null;

import { checkDbConnection } from './db.js';
import recipesRouter      from './routes/recipes.js';
import menusRouter        from './routes/menus.js';
import ordersRouter       from './routes/orders.js';
import usersRouter        from './routes/users.js';
import categoriesRouter, { ensureImageFoldersForAllCategories } from './routes/categories.js';
import rolesRouter        from './routes/roles.js';
import preferencesRouter  from './routes/preferences.js';
import notificationsRouter from './routes/notifications.js';
import surveysRouter      from './routes/surveys.js';
import variablesRouter    from './routes/variables.js';
import reportsRouter      from './routes/reports.js';

const app  = express();
const PORT = process.env.PORT || 3001;
const requireDbOnBoot = process.env.DB_REQUIRED_ON_BOOT === 'true' || process.env.NODE_ENV === 'production';
let dbStartupStatus = 'unchecked';

// En desarrollo: localhost:5173 | En producción: leer de CORS_ORIGIN
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Servir imágenes de recetas desde /images/ en la raíz del proyecto
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

app.use('/api/recipes',       recipesRouter);
app.use('/api/menus',         menusRouter);
app.use('/api/orders',        ordersRouter);
app.use('/api/users',         usersRouter);
app.use('/api/categories',    categoriesRouter);
app.use('/api/roles',         rolesRouter);
app.use('/api/preferences',   preferencesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/surveys',       surveysRouter);
app.use('/api/variables',     variablesRouter);
app.use('/api/reports',       reportsRouter);

// In single-domain deployments, serve the React app from the same Node process.
if (clientDistPath && clientIndexPath) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/images')) {
      return next();
    }
    return res.sendFile(clientIndexPath);
  });
}

app.get('/api/health', (_req, res) => {
  const status = dbStartupStatus === 'degraded' ? 'degraded' : 'ok';
  res.json({ status, db: 'mysql', dbConnection: dbStartupStatus, requireDbOnBoot });
});

// ── Arranque con verificación de BD ───────────────────────────────────
async function startServer() {
  try {
    await checkDbConnection();
    dbStartupStatus = 'ready';
    await ensureImageFoldersForAllCategories();
    console.log('[Images] Carpetas de categorias sincronizadas ✓');
  } catch (err) {
    dbStartupStatus = 'degraded';
    if (requireDbOnBoot) {
      console.error('[Server] No se pudo iniciar: fallo en conexión a la BD.', err.message);
      process.exit(1);
    }
    console.warn('[Server] Iniciando en modo degradado: la BD no está disponible todavía.');
    console.warn('[Images] Sincronizacion de carpetas de categorias pendiente:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`EduEats API → http://localhost:${PORT}`);
  });
}

startServer();
