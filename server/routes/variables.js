import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, value, is_system as isSystem FROM global_variables');
    res.json(rows.map(r => ({ ...r, isSystem: Boolean(r.isSystem) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { id, name, value, isSystem } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM global_variables WHERE id=?', [id]);
    if (existing.length) return res.json({ success: false, message: 'Ya existe una variable con este ID.' });
    await pool.execute('INSERT INTO global_variables (id, name, value, is_system) VALUES (?, ?, ?, ?)',
      [id, name, value, isSystem ? 1 : 0]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const { name, value } = req.body;
  try {
    await pool.execute('UPDATE global_variables SET name=?, value=? WHERE id=?', [name, value, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT is_system FROM global_variables WHERE id=?', [req.params.id]);
    if (!rows.length || rows[0].is_system) return res.json({ success: false, message: 'No se puede eliminar una variable del sistema.' });
    await pool.execute('DELETE FROM global_variables WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
