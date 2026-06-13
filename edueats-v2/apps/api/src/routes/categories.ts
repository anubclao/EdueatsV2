import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getCachedCategories, invalidateCategoriesCache } from '../services/cache-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesRoot = path.join(__dirname, '..', '..', '..', '..', '..', 'images');

export const categoriesRouter = Router();

function isValidCategoryId(id: string) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-_]*$/i.test(id);
}

async function ensureImageFolderForCategoryId(categoryId: string) {
  if (!isValidCategoryId(categoryId)) throw new Error('ID de categoría inválido para carpeta de imágenes.');
  const folderPath = path.join(imagesRoot, categoryId);
  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(path.join(folderPath, '.gitkeep'), '', { flag: 'a' });
}

export async function ensureImageFoldersForAllCategories() {
  const [rows] = await pool.query('SELECT id FROM categories') as any[];
  await fs.mkdir(imagesRoot, { recursive: true });
  await Promise.all(rows.map((r: any) => ensureImageFolderForCategoryId(r.id)));
}

categoriesRouter.get('/', requireAuth, async (_req, res) => {
  try {
    const rows = await getCachedCategories(() =>
      pool.query('SELECT id, name, `order`, exclusive_group AS exclusiveGroup FROM categories ORDER BY `order`')
        .then(result => result[0])
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

categoriesRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const { id, name, order, exclusiveGroup } = req.body;
  try {
    if (!isValidCategoryId(id)) return res.status(400).json({ error: 'ID de categoría inválido.' });
    await pool.execute(
      'INSERT INTO categories (id, name, `order`, exclusive_group) VALUES (?, ?, ?, ?)',
      [id, name, order, exclusiveGroup || null]
    );
    await ensureImageFolderForCategoryId(id);
    await invalidateCategoriesCache();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

categoriesRouter.put('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const { name, order, exclusiveGroup } = req.body;
  try {
    await pool.execute(
      'UPDATE categories SET name=?, `order`=?, exclusive_group=? WHERE id=?',
      [name, order, exclusiveGroup || null, req.params.id]
    );
    await ensureImageFolderForCategoryId(req.params.id);
    await invalidateCategoriesCache();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

categoriesRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
