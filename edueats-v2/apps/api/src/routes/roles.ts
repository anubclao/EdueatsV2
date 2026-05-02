import { Router } from 'express';
import pool from '../db/pool.js';

export const rolesRouter = Router();

rolesRouter.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, description, is_system as isSystem FROM roles') as any[];
    res.json(rows.map((r: any) => ({ ...r, isSystem: Boolean(r.isSystem) })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

rolesRouter.post('/', async (req, res) => {
  const { id, name, description, isSystem } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM roles WHERE id=?', [id]) as any[];
    if (existing.length > 0) return res.json({ success: false });
    await pool.execute(
      'INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)',
      [id, name, description || '', isSystem ? 1 : 0]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

rolesRouter.put('/:id', async (req, res) => {
  const { name, description } = req.body;
  try {
    await pool.execute('UPDATE roles SET name=?, description=? WHERE id=?', [name, description || '', req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

rolesRouter.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT is_system FROM roles WHERE id=?', [req.params.id]) as any[];
    if (!rows.length || rows[0].is_system) return res.json({ success: false });
    await pool.execute('DELETE FROM roles WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
