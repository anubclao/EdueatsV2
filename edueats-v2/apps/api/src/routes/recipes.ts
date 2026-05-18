import crypto from 'crypto';
import { Router } from 'express';
import fs from 'fs/promises';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';
import { getCachedRecipes, invalidateRecipesCache } from '../services/cache-helpers.js';

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
  filename: (req: any, file, cb) => {
    const recipeId = (req.body.recipeId || crypto.randomUUID()).replace(/[^a-z0-9-_]/gi, '');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${recipeId}${ext}`);
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

recipesRouter.post('/upload-image', upload.single('image'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  const category = req._imageCategory || 'general';
  res.json({ imageUrl: `/images/${category}/${req.file.filename}` });
});

recipesRouter.get('/', async (_req, res) => {
  try {
    const rows = await getCachedRecipes(() =>
      pool.query(
        'SELECT id, name, description, category, calories, image_url as imageUrl FROM recipes'
      ).then(result => result[0])
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

recipesRouter.post('/', async (req, res) => {
  const { id, name, description, category, calories, imageUrl } = req.body;
  try {
    await pool.execute(
      'INSERT INTO recipes (id, name, description, category, calories, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, description, category, calories, imageUrl || null]
    );
    await invalidateRecipesCache();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

recipesRouter.put('/:id', async (req, res) => {
  const { name, description, category, calories, imageUrl } = req.body;
  try {
    await pool.execute(
      'UPDATE recipes SET name=?, description=?, category=?, calories=?, image_url=? WHERE id=?',
      [name, description, category, calories, imageUrl || null, req.params.id]
    );
    await invalidateRecipesCache();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

recipesRouter.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM recipes WHERE id=?', [req.params.id]);
    await invalidateRecipesCache();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
