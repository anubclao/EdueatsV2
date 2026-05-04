import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

function toMysqlDateTime(value: any): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (p: number) => String(p).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function fetchOrders(studentId?: string) {
  const whereClause = studentId ? 'WHERE o.student_id = ?' : '';
  const [rows] = await pool.query(`
    SELECT o.id, o.student_id as studentId, o.student_name as studentName,
           o.student_grade as studentGrade, o.student_section as studentSection,
           o.student_allergies as studentAllergies, o.date, o.status, o.timestamp,
           oi.category, oi.recipe_id as recipeId
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    ${whereClause}
    ORDER BY o.timestamp DESC`, studentId ? [studentId] : []) as any[];

  const map: Record<string, any> = {};
  for (const r of rows) {
    if (!map[r.id]) {
      map[r.id] = {
        id: r.id, studentId: r.studentId, studentName: r.studentName,
        studentGrade: r.studentGrade, studentSection: r.studentSection,
        studentAllergies: r.studentAllergies, date: r.date,
        status: r.status, timestamp: r.timestamp, items: [],
      };
    }
    if (r.recipeId) map[r.id].items.push({ category: r.category, recipeId: r.recipeId });
  }
  return Object.values(map);
}

ordersRouter.get('/', async (req, res) => {
  try {
    const isAdmin = req.authUser?.role === 'admin';
    res.json(await fetchOrders(isAdmin ? undefined : req.authUser!.id));
  }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

ordersRouter.get('/count-by-date/:date', async (req, res) => {
  try {
    const isAdmin = req.authUser?.role === 'admin';
    const [[row]] = isAdmin
      ? await pool.execute('SELECT COUNT(*) as count FROM orders WHERE date=?', [req.params.date]) as any[]
      : await pool.execute('SELECT COUNT(*) as count FROM orders WHERE date=? AND student_id=?', [req.params.date, req.authUser!.id]) as any[];
    res.json({ count: Number(row.count) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

async function insertOrder(conn: any, o: any) {
  const { id, studentId, studentName, studentGrade, studentSection, studentAllergies, date, items, status, timestamp } = o;
  const orderTimestamp = toMysqlDateTime(timestamp);
  const [existing] = await conn.execute('SELECT id FROM orders WHERE student_id=? AND date=?', [studentId, date]) as any[];
  if (existing.length) await conn.execute('DELETE FROM orders WHERE student_id=? AND date=?', [studentId, date]);
  await conn.execute(
    'INSERT INTO orders (id, student_id, student_name, student_grade, student_section, student_allergies, date, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, studentId, studentName, studentGrade ?? null, studentSection ?? null, studentAllergies ?? null, date, status, orderTimestamp]
  );
  for (const item of (items ?? [])) {
    await conn.execute('INSERT INTO order_items (order_id, category, recipe_id) VALUES (?, ?, ?)', [id, item.category, item.recipeId]);
  }
}

ordersRouter.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const isAdmin = req.authUser?.role === 'admin';
    if (!isAdmin) {
      req.body.studentId = req.authUser!.id;
      req.body.studentName = req.authUser!.name;
    }
    await conn.beginTransaction();
    await insertOrder(conn, req.body);
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

ordersRouter.post('/batch', async (req, res) => {
  if (req.authUser?.role !== 'admin') return res.status(403).json({ error: 'Sin permisos' });

  const orders: any[] = Array.isArray(req.body) ? req.body : req.body.orders;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const o of orders) await insertOrder(conn, o);
    await conn.commit();
    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

ordersRouter.delete('/:id', async (req, res) => {
  try {
    if (req.authUser?.role !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    await pool.execute('DELETE FROM orders WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
