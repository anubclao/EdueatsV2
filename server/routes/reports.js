import { Router } from 'express';
import pool from '../db.js';

const router = Router();

function toMysqlDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, type, date_generated as dateGenerated, title, content, filters_used as filtersUsed FROM generated_reports ORDER BY date_generated DESC'
    );
    res.json(rows.map(r => ({
      ...r,
      filtersUsed: typeof r.filtersUsed === 'string'
        ? JSON.parse(r.filtersUsed)
        : (r.filtersUsed ?? null),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { id, type, dateGenerated, title, content, filtersUsed } = req.body;
  const normalizedDateGenerated = toMysqlDateTime(dateGenerated);
  const filters = filtersUsed ? JSON.stringify(filtersUsed) : null;
  try {
    await pool.execute(
      `INSERT INTO generated_reports (id, type, date_generated, title, content, filters_used)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE type=?, date_generated=?, title=?, content=?, filters_used=?`,
      [id, type, normalizedDateGenerated, title, content, filters,
       type, normalizedDateGenerated, title, content, filters]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM generated_reports WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
