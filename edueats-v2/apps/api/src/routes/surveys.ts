import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

export const surveysRouter = Router();

// --- Definitions ---
surveysRouter.get('/definitions', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, DATE_FORMAT(start_date, '%Y-%m-%d') as startDate, DATE_FORMAT(end_date, '%Y-%m-%d') as endDate, is_active as isActive, created_at as createdAt FROM survey_definitions ORDER BY start_date DESC"
    ) as any[];
    res.json(rows.map((r: any) => ({ ...r, isActive: Boolean(r.isActive) })));
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

surveysRouter.post('/definitions', requireAuth, requireRoles('admin'), async (req, res) => {
  const { id, title, startDate, endDate, isActive, createdAt } = req.body;
  try {
    const created = createdAt
      ? new Date(createdAt).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO survey_definitions (id, title, start_date, end_date, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, startDate, endDate, isActive ? 1 : 0, created]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

surveysRouter.put('/definitions/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const { title, startDate, endDate, isActive } = req.body;
  try {
    await pool.execute(
      'UPDATE survey_definitions SET title=?, start_date=?, end_date=?, is_active=? WHERE id=?',
      [title, startDate, endDate, isActive ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

surveysRouter.delete('/definitions/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM survey_definitions WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

// --- Results ---
surveysRouter.get('/results/check', requireAuth, async (req, res) => {
  const { userId, surveyDefId } = req.query as Record<string, string>;
  try {
    // Los estudiantes solo pueden chequear su propio check; admin y staff pueden ver cualquiera.
    if (req.authUser?.role === 'student' && req.authUser.id !== userId) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const [rows] = await pool.execute(
      'SELECT id FROM survey_results WHERE user_id=? AND survey_definition_id=?',
      [userId, surveyDefId]
    ) as any[];
    res.json(rows.length > 0);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

surveysRouter.get('/results', requireAuth, async (req, res) => {
  const { surveyDefId, type } = req.query as Record<string, string>;
  try {
    let sql = `SELECT id, survey_definition_id as surveyDefinitionId, user_id as userId,
      user_name as userName, user_role as userRole, user_phone as userPhone, DATE_FORMAT(date, '%Y-%m-%d') as date,
      quality_rating as qualityRating, quantity_rating as quantityRating,
      type, comment, admin_response as adminResponse, status
      FROM survey_results`;
    const params: any[] = [];
    const conditions: string[] = [];
    if (surveyDefId) { conditions.push('survey_definition_id=?'); params.push(surveyDefId); }
    if (type) { conditions.push('type=?'); params.push(type); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY date DESC';
    const [rows] = await pool.query(sql, params) as any[];
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

surveysRouter.post('/results', async (req, res) => {
  const { id, surveyDefinitionId, userId, userName, userRole, userPhone, date, qualityRating, quantityRating, type, comment, status } = req.body;
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM survey_results WHERE user_id=? AND survey_definition_id=?',
      [userId, surveyDefinitionId]
    ) as any[];
    if (existing.length) return res.json({ success: false, message: 'Ya has respondido a esta encuesta.' });
    await pool.execute(
      'INSERT INTO survey_results (id, survey_definition_id, user_id, user_name, user_role, user_phone, date, quality_rating, quantity_rating, type, comment, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, surveyDefinitionId, userId, userName, userRole, userPhone ?? null, date, qualityRating, quantityRating, type, comment, status ?? 'pending']
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

surveysRouter.put('/results/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const { adminResponse, status } = req.body;
  try {
    await pool.execute('UPDATE survey_results SET admin_response=?, status=? WHERE id=?',
      [adminResponse ?? null, status, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
