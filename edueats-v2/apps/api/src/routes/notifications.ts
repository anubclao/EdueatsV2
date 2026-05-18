import { Router } from 'express';
import pool from '../db/pool.js';
import { enqueueNotification } from '../services/queue.js';
import { broadcastMessage, notifyAdmins } from '../services/websocket.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date, message, original_message as originalMessage, type, target_role as targetRole FROM system_notifications ORDER BY date DESC"
    ) as any[];
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

notificationsRouter.post('/', async (req, res) => {
  const { id, date, message, originalMessage, type, targetRole } = req.body;
  try {
    await pool.execute(
      'INSERT INTO system_notifications (id, date, message, original_message, type, target_role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, date, message, originalMessage ?? null, type ?? 'info', targetRole ?? 'all']
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
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

notificationsRouter.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM system_notifications WHERE id=?', [req.params.id]);

    broadcastMessage('notifications:deleted', {
      id: req.params.id,
      at: Date.now(),
    });

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
