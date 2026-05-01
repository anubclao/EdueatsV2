import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, description, is_system as isSystem FROM roles');
    res.json(rows.map(r => ({ ...r, isSystem: Boolean(r.isSystem) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { id, name, description, isSystem } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM roles WHERE id=?', [id]);
    if (existing.length > 0) return res.json({ success: false });
    await pool.execute('INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)',
      [id, name, description || '', isSystem ? 1 : 0]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { name, description } = req.body;
  try {
    await pool.execute('UPDATE roles SET name=?, description=? WHERE id=?',
      [name, description || '', req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT is_system FROM roles WHERE id=?', [req.params.id]);
    if (!rows.length || rows[0].is_system) return res.json({ success: false });
    await pool.execute('DELETE FROM roles WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
