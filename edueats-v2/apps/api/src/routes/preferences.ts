import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const preferencesRouter = Router();

preferencesRouter.get('/:studentId', requireAuth, async (req, res) => {
  // Los estudiantes solo pueden ver sus propias preferencias recurrentes.
  // admin/staff/teacher/visitor pueden ver cualquiera.
  if (req.authUser?.role === 'student' && req.authUser.id !== req.params.studentId) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  try {
    const [rows] = await pool.query(`
      SELECT rp.student_id as studentId, rp.day_of_week as dayOfWeek,
             rpi.category, rpi.recipe_id as recipeId
      FROM recurring_preferences rp
      LEFT JOIN recurring_preference_items rpi
        ON rp.student_id=rpi.student_id AND rp.day_of_week=rpi.day_of_week
      WHERE rp.student_id=?`, [req.params.studentId]) as any[];

    const map: Record<string, any> = {};
    for (const r of rows) {
      const key = `${r.studentId}-${r.dayOfWeek}`;
      if (!map[key]) map[key] = { studentId: r.studentId, dayOfWeek: r.dayOfWeek, items: [] };
      if (r.recipeId) map[key].items.push({ category: r.category, recipeId: r.recipeId });
    }
    res.json(Object.values(map));
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

preferencesRouter.post('/', requireAuth, async (req, res) => {
  const { studentId, dayOfWeek, items } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM recurring_preferences WHERE student_id=? AND day_of_week=?', [studentId, dayOfWeek]);
    await conn.execute('INSERT INTO recurring_preferences (student_id, day_of_week) VALUES (?, ?)', [studentId, dayOfWeek]);
    for (const item of (items ?? [])) {
      await conn.execute(
        'INSERT INTO recurring_preference_items (student_id, day_of_week, category, recipe_id) VALUES (?, ?, ?, ?)',
        [studentId, dayOfWeek, item.category, item.recipeId]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { conn.release(); }
});

preferencesRouter.delete('/:studentId/:dayOfWeek', requireAuth, async (req, res) => {
  if (req.authUser?.role === 'student' && req.authUser.id !== req.params.studentId) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  try {
    await pool.execute('DELETE FROM recurring_preferences WHERE student_id=? AND day_of_week=?',
      [req.params.studentId, req.params.dayOfWeek]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
