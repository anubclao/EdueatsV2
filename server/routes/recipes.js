import { Router } from 'express';
import pool from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesRoot = path.join(__dirname, '..', '..', 'images');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const category = req.body.category || 'general';
    // Sanitize: only allow safe folder names
    const safeCategory = category.replace(/[^a-z0-9-_]/gi, '');
    const dest = path.join(imagesRoot, safeCategory);
    await fs.mkdir(dest, { recursive: true });
    req._imageCategory = safeCategory;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
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

const router = Router();

// ── Upload de imagen para receta ──────────────────────────────────────
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  const category = req._imageCategory || 'general';
  const imageUrl = `/images/${category}/${req.file.filename}`;
  res.json({ imageUrl });
});

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, description, category, calories, image_url as imageUrl FROM recipes');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { id, name, description, category, calories, imageUrl } = req.body;
  try {
    await pool.execute(
      'INSERT INTO recipes (id, name, description, category, calories, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, description, category, calories, imageUrl || null]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { name, description, category, calories, imageUrl } = req.body;
  try {
    await pool.execute(
      'UPDATE recipes SET name=?, description=?, category=?, calories=?, image_url=? WHERE id=?',
      [name, description, category, calories, imageUrl || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM recipes WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
