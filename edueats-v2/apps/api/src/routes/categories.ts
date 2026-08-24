import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getCachedCategories, invalidateCategoriesCache } from '../services/cache-helpers.js';
import { getSchoolId } from '../services/tenant.js';

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

/**
 * Devuelve todas las categorías del colegio. El `school_id` se ignora adrede
 * para esta función utilitaria porque solo se usa en tareas de bootstrap/admin
 * cross-tenant (crear carpetas de imágenes para cada colegio).
 */
export async function ensureImageFoldersForAllCategories() {
  const [rows] = await pool.query('SELECT id, school_id FROM categories') as any[];
  await fs.mkdir(imagesRoot, { recursive: true });
  await Promise.all(rows.map((r: any) => ensureImageFolderForCategoryId(r.id)));
}

categoriesRouter.get('/', requireAuth, async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const rows = await getCachedCategories(schoolId, () =>
      pool.execute(
        'SELECT id, name, `order`, exclusive_group AS exclusiveGroup FROM categories WHERE school_id = ? ORDER BY `order`',
        [schoolId]
      ).then(result => (result as any[])[0])
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

categoriesRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, name, order, exclusiveGroup } = req.body;
  try {
    if (!isValidCategoryId(id)) return res.status(400).json({ error: 'ID de categoría inválido.' });
    await pool.execute(
      'INSERT INTO categories (id, name, `order`, exclusive_group, school_id) VALUES (?, ?, ?, ?, ?)',
      [id, name, order, exclusiveGroup || null, schoolId]
    );
    await ensureImageFolderForCategoryId(id);
    await invalidateCategoriesCache(schoolId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

categoriesRouter.put('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { name, order, exclusiveGroup } = req.body;
  try {
    await pool.execute(
      'UPDATE categories SET name=?, `order`=?, exclusive_group=? WHERE id=? AND school_id=?',
      [name, order, exclusiveGroup || null, req.params.id, schoolId]
    );
    await ensureImageFolderForCategoryId(req.params.id);
    await invalidateCategoriesCache(schoolId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

categoriesRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    await pool.execute('DELETE FROM categories WHERE id=? AND school_id=?', [req.params.id, schoolId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
