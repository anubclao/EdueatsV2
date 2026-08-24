import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { enqueueNotification } from '../services/queue.js';
import { broadcastMessage, notifyAdmins } from '../services/websocket.js';
import { getSchoolId } from '../services/tenant.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const [rows] = await pool.query(
      "SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date, message, original_message as originalMessage, type, target_role as targetRole FROM system_notifications WHERE school_id = ? ORDER BY date DESC",
      [schoolId]
    ) as any[];
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

notificationsRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  const { id, date, message, originalMessage, type, targetRole } = req.body;
  try {
    await pool.execute(
      'INSERT INTO system_notifications (id, date, message, original_message, type, target_role, school_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, date, message, originalMessage ?? null, type ?? 'info', targetRole ?? 'all', schoolId]
    );

    const payload = {
      id,
      date,
      message,
      originalMessage: originalMessage ?? null,
      type: type ?? 'info',
      targetRole: targetRole ?? 'all',
      at: Date.now(),
    };

    void enqueueNotification('custom', {
      userId: 'broadcast',
      type: payload.type,
      message: payload.message,
      targetRole: payload.targetRole,
      date: payload.date,
    });

    broadcastMessage('notifications:new', payload);
    notifyAdmins('notifications:new', payload);

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

notificationsRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    await pool.execute('DELETE FROM system_notifications WHERE id=? AND school_id=?', [req.params.id, schoolId]);

    broadcastMessage('notifications:deleted', {
      id: req.params.id,
      at: Date.now(),
    });

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
