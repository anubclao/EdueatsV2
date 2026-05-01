import { Router } from 'express';
import pool from '../db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesRoot = path.join(__dirname, '..', '..', 'images');

function isValidCategoryId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-_]*$/i.test(id);
}

async function ensureImageFolderForCategoryId(categoryId) {
  if (!isValidCategoryId(categoryId)) {
    throw new Error('ID de categoría inválido para carpeta de imágenes.');
  }
  const categoryFolderPath = path.join(imagesRoot, categoryId);
  await fs.mkdir(categoryFolderPath, { recursive: true });
  await fs.writeFile(path.join(categoryFolderPath, '.gitkeep'), '', { flag: 'a' });
}

export async function ensureImageFoldersForAllCategories() {
  const [rows] = await pool.query('SELECT id FROM categories');
  await fs.mkdir(imagesRoot, { recursive: true });
  await Promise.all(rows.map(({ id }) => ensureImageFolderForCategoryId(id)));
}

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, `order` as `order` FROM categories ORDER BY `order`');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { id, name, order } = req.body;
  try {
    if (!isValidCategoryId(id)) {
      return res.status(400).json({ error: 'ID de categoría inválido. Usa letras, números, guión o guión bajo.' });
    }
    await pool.execute('INSERT INTO categories (id, name, `order`) VALUES (?, ?, ?)', [id, name, order]);
    await ensureImageFolderForCategoryId(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { name, order } = req.body;
  try {
    await pool.execute('UPDATE categories SET name=?, `order`=? WHERE id=?', [name, order, req.params.id]);
    await ensureImageFolderForCategoryId(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
