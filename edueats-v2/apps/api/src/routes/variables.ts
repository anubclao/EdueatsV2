import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getSchoolId } from '../services/tenant.js';

export const variablesRouter = Router();

variablesRouter.get('/', requireAuth, async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const [rows] = await pool.query('SELECT id, name, value, is_system as isSystem FROM global_variables WHERE school_id = ?', [schoolId]) as any[];
    res.json(rows.map((r: any) => ({ ...r, isSystem: Boolean(r.isSystem) })));
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

variablesRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, name, value, isSystem } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM global_variables WHERE id=? AND school_id=?', [id, schoolId]) as any[];
    if (existing.length) return res.json({ success: false, message: 'Ya existe una variable con este ID.' });
    // Forzar isSystem=0 — solo el sistema puede crear variables de sistema
    // (ej: migración o seed inicial). Un admin que crea una variable vía API
    // no debe poder marcarla como de sistema.
    await pool.execute('INSERT INTO global_variables (id, name, value, is_system, school_id) VALUES (?, ?, ?, 0, ?)',
      [id, name, value, schoolId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

variablesRouter.put('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { name, value } = req.body;
  try {
    await pool.execute('UPDATE global_variables SET name=?, value=? WHERE id=? AND school_id=?', [name, value, req.params.id, schoolId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

variablesRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const [rows] = await pool.execute('SELECT is_system FROM global_variables WHERE id=? AND school_id=?', [req.params.id, schoolId]) as any[];
    if (!rows.length || rows[0].is_system) return res.json({ success: false, message: 'No se puede eliminar una variable del sistema.' });
    await pool.execute('DELETE FROM global_variables WHERE id=? AND school_id=?', [req.params.id, schoolId]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
