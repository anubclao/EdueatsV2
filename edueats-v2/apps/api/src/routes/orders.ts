import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { enqueueEmail, enqueueNotification } from '../services/queue.js';
import { notifyAdmins, notifyOrder, notifyUser } from '../services/websocket.js';
import { getSchoolId } from '../services/tenant.js';
import { InMemoryRateLimitStore } from '../middleware/in-memory-rate-limit-store.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// ── Rate limit específico para orders ────────────────────────────────────
// Diseñado para el evento en vivo con 120 alumnos simultáneos.
//
// Doble bucket:
//   - por usuario autenticado (5 pedidos/min) → evita que un alumno con
//     sesión válida haga spam desde un mismo cliente
//   - por IP (20 pedidos/min) → atrapa el caso de un alumno haciendo
//     requests sin auth válida o con sesiones distintas desde una misma
//     IP compartida (WiFi del colegio)
//
// 120 alumnos × 1 pedido cada 5 min = 24 pedidos/min pico, holgura amplia.
const ordersUserLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req: any) => `orders:user:${req.authUser?.id ?? req.ip ?? 'anon'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Estás haciendo pedidos demasiado rápido. Espera un momento.' },
  store: new InMemoryRateLimitStore(),
});
const ordersIpLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: (req: any) => `orders:ip:${req.ip ?? 'unknown'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos desde tu conexión. Espera un momento.' },
  store: new InMemoryRateLimitStore(),
});
ordersRouter.use(ordersUserLimiter, ordersIpLimiter);

// Schema para un item de pedido. recipeId puede venir con prefijo __NO_SELECTION__
// (lo usa el frontend cuando el usuario no eligió plato en una categoría).
const orderItemSchema = z.object({
  category: z.string().trim().min(1).max(64),
  recipeId: z.string().trim().min(1).max(120),
});

// Schema base compartido entre / y /batch.
const baseOrderSchema = z.object({
  id: z.string().trim().min(1).max(80),
  studentId: z.string().trim().min(1).max(80),
  studentName: z.string().trim().min(1).max(150),
  studentGrade: z.union([z.number().int().min(0).max(20), z.string()]).optional(),
  studentSection: z.string().trim().max(10).optional(),
  studentAllergies: z.string().trim().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
  status: z.enum(['confirmed', 'pending']).default('pending'),
  timestamp: z.union([z.string(), z.number(), z.date()]).optional(),
  items: z.array(orderItemSchema).max(40),
});

// Schema para la creación individual: el admin puede inyectar cualquier
// studentId/studentName, pero el estudiante solo puede crear SU propio pedido.
const orderCreateSchema = baseOrderSchema.extend({
  studentId: z.string().trim().min(1).max(80),
  studentName: z.string().trim().min(1).max(150),
});

// Schema para /batch: solo admin, no confiamos en ningún studentId del cliente.
const orderBatchSchema = z.array(baseOrderSchema).min(1).max(500);

function toMysqlDateTime(value: any): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (p: number) => String(p).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function fetchOrders(schoolId: string, studentId?: string) {
  // Estudiantes: solo sus pedidos. Admin: todos los del colegio.
  // Como ya validamos role arriba, podemos componer WHERE seguro.
  const params: any[] = [schoolId];
  let where = 'WHERE o.school_id = ?';
  if (studentId) { where += ' AND o.student_id = ?'; params.push(studentId); }

  const [rows] = await pool.query(`
    SELECT o.id, o.student_id as studentId, o.student_name as studentName,
           o.student_grade as studentGrade, o.student_section as studentSection,
        o.student_allergies as studentAllergies, DATE_FORMAT(o.date, '%Y-%m-%d') as date, o.status, o.timestamp,
           oi.category, oi.recipe_id as recipeId
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    ${where}
    ORDER BY o.timestamp DESC`, params) as any[];

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
  const schoolId = getSchoolId(req);
  try {
    const isAdmin = req.authUser?.role === 'admin';
    res.json(await fetchOrders(schoolId, isAdmin ? undefined : req.authUser!.id));
  }
  catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

ordersRouter.get('/count-by-date/:date', async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    const isAdmin = req.authUser?.role === 'admin';
    const [[row]] = isAdmin
      ? await pool.execute('SELECT COUNT(*) as count FROM orders WHERE date=? AND school_id=?', [req.params.date, schoolId]) as any[]
      : await pool.execute('SELECT COUNT(*) as count FROM orders WHERE date=? AND student_id=? AND school_id=?', [req.params.date, req.authUser!.id, schoolId]) as any[];
    res.json({ count: Number(row.count) });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

async function insertOrder(conn: any, o: any) {
  const { id, studentId, studentName, studentGrade, studentSection, studentAllergies, date, items, status, timestamp, schoolId } = o;
  const orderTimestamp = toMysqlDateTime(timestamp);
  // Cleanup previo scoped al colegio (no del cliente — previene cross-tenant collisions).
  const [existing] = await conn.execute('SELECT id FROM orders WHERE student_id=? AND date=? AND school_id=?', [studentId, date, schoolId]) as any[];
  if (existing.length) await conn.execute('DELETE FROM orders WHERE student_id=? AND date=? AND school_id=?', [studentId, date, schoolId]);
  await conn.execute(
    'INSERT INTO orders (id, student_id, student_name, student_grade, student_section, student_allergies, date, status, timestamp, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, studentId, studentName, studentGrade ?? null, studentSection ?? null, studentAllergies ?? null, date, status, orderTimestamp, schoolId]
  );
  for (const item of (items ?? [])) {
    await conn.execute(
      'INSERT INTO order_items (order_id, category, recipe_id, school_id) VALUES (?, ?, ?, ?)',
      [id, item.category, item.recipeId, schoolId]
    );
  }
}

ordersRouter.post('/', async (req, res) => {
  const schoolId = getSchoolId(req);
  const parsed = orderCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos de pedido inválidos.', details: parsed.error.flatten() });
  }
  const order = parsed.data;

  // Validación de fecha: no se pueden crear pedidos para días pasados.
  // Admin puede sobreescribir esta restricción (caso: registrar pedido manual
  // fuera de ventana). Estudiante queda bloqueado en el pasado.
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isAdmin = req.authUser?.role === 'admin';
  if (!isAdmin && order.date < todayStr) {
    return res.status(400).json({
      error: `No puedes crear pedidos para fechas pasadas. Hoy es ${todayStr}, intentaste pedir para ${order.date}.`,
    });
  }

  const conn = await pool.getConnection();
  try {
    if (!isAdmin) {
      // Forzar que el pedido sea SIEMPRE del usuario autenticado,
      // ignorando cualquier studentId/studentName que mande el cliente.
      order.studentId = req.authUser!.id;
      order.studentName = req.authUser!.name;
      // Limpiar campos que el estudiante no puede autodeclarar.
      order.studentAllergies = undefined;
    }
    await conn.beginTransaction();
    await insertOrder(conn, { ...order, schoolId });
    await conn.commit();

    void enqueueNotification('order-placed', {
      userId: order.studentId,
      orderId: order.id,
      date: order.date,
      status: order.status,
      createdAt: Date.now(),
    });

    const [studentRows] = await pool.execute('SELECT email FROM users WHERE id=? LIMIT 1', [order.studentId]) as any[];
    const studentEmail = studentRows?.[0]?.email;
    if (studentEmail) {
      void enqueueEmail('confirmation', {
        userId: order.studentId,
        email: studentEmail,
        orderId: order.id,
        deliveryDate: order.date,
        totalPrice: 0,
      });
    }

    notifyUser(order.studentId, 'orders:updated', {
      orderId: order.id,
      status: order.status,
      date: order.date,
      at: Date.now(),
    });
    notifyOrder(order.id, 'orders:updated', {
      orderId: order.id,
      status: order.status,
      at: Date.now(),
    });
    notifyAdmins('orders:created', {
      orderId: order.id,
      studentId: order.studentId,
      date: order.date,
      status: order.status,
      at: Date.now(),
    });

    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { conn.release(); }
});

ordersRouter.post('/batch', async (req, res) => {
  const schoolId = getSchoolId(req);
  if (req.authUser?.role !== 'admin') return res.status(403).json({ error: 'Sin permisos' });

  const input = Array.isArray(req.body) ? req.body : req.body.orders;
  const parsed = orderBatchSchema.safeParse(input);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Lote de pedidos inválido.', details: parsed.error.flatten() });
  }
  const orders = parsed.data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const o of orders) await insertOrder(conn, { ...o, schoolId });
    await conn.commit();

    for (const o of orders) {
      void enqueueNotification('order-placed', {
        userId: o.studentId,
        orderId: o.id,
        date: o.date,
        status: o.status,
        createdAt: Date.now(),
      });

      notifyUser(o.studentId, 'orders:updated', {
        orderId: o.id,
        status: o.status,
        date: o.date,
        at: Date.now(),
      });
      notifyOrder(o.id, 'orders:updated', {
        orderId: o.id,
        status: o.status,
        at: Date.now(),
      });
    }

    notifyAdmins('orders:batch-created', {
      count: orders.length,
      at: Date.now(),
    });

    res.json({ success: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally { conn.release(); }
});

ordersRouter.delete('/:id', async (req, res) => {
  const schoolId = getSchoolId(req);
  try {
    if (req.authUser?.role !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    await pool.execute('DELETE FROM orders WHERE id=? AND school_id=?', [req.params.id, schoolId]);

    void enqueueNotification('custom', {
      userId: req.authUser.id,
      type: 'order-deleted',
      orderId: req.params.id,
      message: `Pedido ${req.params.id} eliminado por administrador.`,
      createdAt: Date.now(),
    });
    notifyOrder(req.params.id, 'orders:deleted', {
      orderId: req.params.id,
      at: Date.now(),
    });
    notifyAdmins('orders:deleted', {
      orderId: req.params.id,
      by: req.authUser.id,
      at: Date.now(),
    });

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
