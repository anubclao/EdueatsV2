import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, date, message, original_message as originalMessage, type, target_role as targetRole FROM system_notifications ORDER BY date DESC'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { id, date, message, originalMessage, type, targetRole } = req.body;
  try {
    await pool.execute(
      'INSERT INTO system_notifications (id, date, message, original_message, type, target_role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, date, message, originalMessage || null, type || 'info', targetRole || 'all']
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM system_notifications WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
