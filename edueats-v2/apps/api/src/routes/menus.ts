import { Router } from 'express';
import pool from '../db/pool.js';

export const menusRouter = Router();

async function fetchMenus(date?: string) {
  let sql = `
    SELECT DATE_FORMAT(dmc.date, '%Y-%m-%d') as date, dmc.is_published,
           dmi.recipe_id, dmi.is_mandatory
    FROM daily_menu_configs dmc
    LEFT JOIN daily_menu_items dmi ON dmc.date = dmi.menu_date`;
  const params: any[] = [];
  if (date) { sql += ' WHERE dmc.date=?'; params.push(date); }
  sql += ' ORDER BY dmc.date DESC';

  const [rows] = await pool.query(sql, params) as any[];
  const map: Record<string, any> = {};
  for (const r of rows) {
    if (!map[r.date]) map[r.date] = { date: r.date, isPublished: Boolean(r.is_published), items: [] };
    if (r.recipe_id) map[r.date].items.push({ recipeId: r.recipe_id, isMandatory: Boolean(r.is_mandatory) });
  }
  return Object.values(map);
}

menusRouter.get('/', async (_req, res) => {
  try { res.json(await fetchMenus()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

menusRouter.get('/:date', async (req, res) => {
  try {
    const menus = await fetchMenus(req.params.date);
    res.json(menus[0] ?? null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

menusRouter.post('/', async (req, res) => {
  const { date, isPublished, items } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT INTO daily_menu_configs (date, is_published) VALUES (?, ?) ON DUPLICATE KEY UPDATE is_published=?',
      [date, isPublished ? 1 : 0, isPublished ? 1 : 0]
    );
    await conn.execute('DELETE FROM daily_menu_items WHERE menu_date=?', [date]);
    for (const item of (items ?? [])) {
      await conn.execute(
        'INSERT INTO daily_menu_items (menu_date, recipe_id, is_mandatory) VALUES (?, ?, ?)',
        [date, item.recipeId, item.isMandatory ? 1 : 0]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

menusRouter.delete('/:date', async (req, res) => {
  try {
    await pool.execute('DELETE FROM daily_menu_configs WHERE date=?', [req.params.date]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
