import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getSchoolId } from '../services/tenant.js';

export const reportsRouter = Router();

function toMysqlDateTime(value: any): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (p: number) => String(p).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

reportsRouter.get('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const [rows] = await pool.query(
      'SELECT id, type, date_generated as dateGenerated, title, content, filters_used as filtersUsed FROM generated_reports WHERE school_id = ? ORDER BY date_generated DESC',
      [schoolId]
    ) as any[];
    res.json(rows.map((r: any) => ({
      ...r,
      filtersUsed: typeof r.filtersUsed === 'string' ? JSON.parse(r.filtersUsed) : (r.filtersUsed ?? null),
    })));
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

reportsRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, type, dateGenerated, title, content, filtersUsed } = req.body;
  const normalizedDate = toMysqlDateTime(dateGenerated);
  const filters = filtersUsed ? JSON.stringify(filtersUsed) : null;
  try {
    await pool.execute(
      `INSERT INTO generated_reports (id, type, date_generated, title, content, filters_used, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE type=?, date_generated=?, title=?, content=?, filters_used=?`,
      [id, type, normalizedDate, title, content, filters, schoolId,
       type, normalizedDate, title, content, filters]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

reportsRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    await pool.execute('DELETE FROM generated_reports WHERE id=? AND school_id=?', [req.params.id, schoolId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

reportsRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, type, dateGenerated, title, content, filtersUsed } = req.body;
  const normalizedDate = toMysqlDateTime(dateGenerated);
  const filters = filtersUsed ? JSON.stringify(filtersUsed) : null;
  try {
    await pool.execute(
      `INSERT INTO generated_reports (id, type, date_generated, title, content, filters_used, school_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE type=?, date_generated=?, title=?, content=?, filters_used=?`,
      [id, type, normalizedDate, title, content, filters, schoolId,
       type, normalizedDate, title, content, filters]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

reportsRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    await pool.execute('DELETE FROM generated_reports WHERE id=? AND school_id=?', [req.params.id, schoolId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
