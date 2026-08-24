import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getCachedMenus, invalidateMenuCache } from '../services/cache-helpers.js';
import { getSchoolId } from '../services/tenant.js';

export const menusRouter = Router();

async function fetchMenus(schoolId: string, date?: string) {
  let sql = `
    SELECT DATE_FORMAT(dmc.date, '%Y-%m-%d') as date, dmc.is_published,
           dmi.recipe_id, dmi.is_mandatory
    FROM daily_menu_configs dmc
    LEFT JOIN daily_menu_items dmi ON dmc.date = dmi.menu_date
    WHERE dmc.school_id = ?`;
  const params: any[] = [schoolId];
  if (date) { sql += ' AND dmc.date=?'; params.push(date); }
  sql += ' ORDER BY dmc.date DESC';

  const [rows] = await pool.query(sql, params) as any[];
  const map: Record<string, any> = {};
  for (const r of rows) {
    if (!map[r.date]) map[r.date] = { date: r.date, isPublished: Boolean(r.is_published), items: [] };
    if (r.recipe_id) map[r.date].items.push({ recipeId: r.recipe_id, isMandatory: Boolean(r.is_mandatory) });
  }
  return Object.values(map);
}

menusRouter.get('/', requireAuth, async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const menus = await getCachedMenus('menus:all', () => fetchMenus(schoolId));
    res.json(menus);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

menusRouter.get('/:date', requireAuth, async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const menu = await getCachedMenus(`menu:${schoolId}:${req.params.date}`, () => fetchMenus(schoolId, req.params.date));
    res.json(menu[0] ?? null);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

menusRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { date, isPublished, items } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT INTO daily_menu_configs (date, is_published, school_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_published=?',
      [date, isPublished ? 1 : 0, schoolId, isPublished ? 1 : 0]
    );
    await conn.execute('DELETE FROM daily_menu_items WHERE menu_date=? AND school_id=?', [date, schoolId]);
    for (const item of (items ?? [])) {
      await conn.execute(
        'INSERT INTO daily_menu_items (menu_date, recipe_id, is_mandatory, school_id) VALUES (?, ?, ?, ?)',
        [date, item.recipeId, item.isMandatory ? 1 : 0, schoolId]
      );
    }
    await conn.commit();
    // Invalidate cache after update
    await invalidateMenuCache({ schoolId });
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { conn.release(); }
});

menusRouter.delete('/:date', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    await pool.execute('DELETE FROM daily_menu_configs WHERE date=? AND school_id=?', [req.params.date, schoolId]);
    // Invalidate cache after delete
    await invalidateMenuCache({ schoolId, date: req.params.date });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
