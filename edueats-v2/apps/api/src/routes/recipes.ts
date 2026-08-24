import crypto from 'crypto';
import { Router } from 'express';
import fs from 'fs/promises';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getCachedRecipes, invalidateRecipesCache } from '../services/cache-helpers.js';
import { getSchoolId } from '../services/tenant.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesRoot = path.join(__dirname, '..', '..', '..', '..', '..', 'images');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: async (req: any, _file, cb) => {
    const category = (req.body.category || 'general').replace(/[^a-z0-9-_]/gi, '');
    const dest = path.join(imagesRoot, category);
    await fs.mkdir(dest, { recursive: true });
    req._imageCategory = category;
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    // Use a fresh UUID as the on-disk filename. We deliberately IGNORE the
    // recipeId from the request body: trusting client-supplied names is a
    // path-traversal / overwrite vector and previously produced truncated
    // UUIDs in the DB (the prior regex was over-aggressive). The returned
    // response.json uses req.file.filename, so the DB always stores exactly
    // what is on disk — no drift possible.
    const filename = `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase() || '.png'}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Usa jpg, png, webp o gif.'));
  },
});

export const recipesRouter = Router();

recipesRouter.post('/upload-image', requireAuth, requireRoles('admin'), upload.single('image'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  const category = req._imageCategory || 'general';
  res.json({ imageUrl: `/images/${category}/${req.file.filename}` });
});

recipesRouter.get('/', requireAuth, async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const rows = await getCachedRecipes(schoolId, () =>
      pool.execute(
        'SELECT id, name, description, category, calories, image_url as imageUrl FROM recipes WHERE school_id = ?',
        [schoolId]
      ).then(result => (result as any[])[0])
    );
    res.json(rows);
  } catch (e: any) {
    // Loguear el error real para diagnóstico. El cliente sigue recibiendo
    // 500 genérico (error.ts se encarga de no filtrar detalles).
    console.error('[recipes GET] Error fetching recipes:', e?.code, e?.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

recipesRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, name, description, category, calories, imageUrl } = req.body;
  try {
    await pool.execute(
      'INSERT INTO recipes (id, name, description, category, calories, image_url, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, description, category, calories, imageUrl || null, schoolId]
    );
    await invalidateRecipesCache(schoolId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

recipesRouter.put('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { name, description, category, calories, imageUrl } = req.body;
  try {
    const [result] = await pool.execute(
      'UPDATE recipes SET name=?, description=?, category=?, calories=?, image_url=? WHERE id=? AND school_id=?',
      [name, description, category, calories, imageUrl || null, req.params.id, schoolId]
    ) as any[];
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Receta no encontrada en este colegio.' });
    }
    await invalidateRecipesCache(schoolId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

recipesRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const [result] = await pool.execute('DELETE FROM recipes WHERE id=? AND school_id=?', [req.params.id, schoolId]) as any[];
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Receta no encontrada en este colegio.' });
    }
    await invalidateRecipesCache(schoolId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
