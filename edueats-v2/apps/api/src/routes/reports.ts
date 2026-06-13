import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

export const reportsRouter = Router();

function toMysqlDateTime(value: any): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (p: number) => String(p).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

reportsRouter.get('/', requireAuth, requireRoles('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, type, date_generated as dateGenerated, title, content, filters_used as filtersUsed FROM generated_reports ORDER BY date_generated DESC'
    ) as any[];
    res.json(rows.map((r: any) => ({
      ...r,
      filtersUsed: typeof r.filtersUsed === 'string' ? JSON.parse(r.filtersUsed) : (r.filtersUsed ?? null),
    })));
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

reportsRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const { id, type, dateGenerated, title, content, filtersUsed } = req.body;
  const normalizedDate = toMysqlDateTime(dateGenerated);
  const filters = filtersUsed ? JSON.stringify(filtersUsed) : null;
  try {
    await pool.execute(
      `INSERT INTO generated_reports (id, type, date_generated, title, content, filters_used)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE type=?, date_generated=?, title=?, content=?, filters_used=?`,
      [id, type, normalizedDate, title, content, filters,
       type, normalizedDate, title, content, filters]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

reportsRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM generated_reports WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
