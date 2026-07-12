/**
 * WebSocket Service for Real-Time Notifications
 * Allows clients to receive order updates, notifications, etc. in real-time
 *
 * SEGURIDAD:
 *  - El handshake autentica al cliente contra la tabla `auth_sessions`
 *    (mismo flujo que el middleware HTTP requireAuth). Si la cookie no
 *    es válida, la conexión se rechaza con error antes de aceptar eventos.
 *  - Los handlers join-* ya no confían en el userId/orderId enviado por
 *    el cliente: el servidor deriva la identidad del socket autenticado.
 *    El cliente puede pasar orderId SOLO si el socket es del dueño del
 *    pedido o de un admin.
 */
import { Server as SocketIOServer } from 'socket.io';
import pool from '../db/pool.js';
import { hashToken } from '../middleware/auth.js';
import { getBogotaStartOfDayMs } from './timezone.js';
const SESSION_COOKIE = 'edueats_session';
const SESSION_COOKIE_PROD = '__Host-edueats_session';
const isProduction = process.env.NODE_ENV === 'production';
const ACTIVE_COOKIE_NAME = isProduction ? SESSION_COOKIE_PROD : SESSION_COOKIE;
let io = null;
const connectedUsers = new Map(); // userId -> [socketIds]
/** Parsea una cookie simple y devuelve el valor asociado a la clave. */
function parseCookie(cookieHeader, key) {
    if (!cookieHeader)
        return null;
    const chunks = cookieHeader.split(';');
    for (const chunk of chunks) {
        const [rawKey, ...rest] = chunk.trim().split('=');
        if (rawKey !== key)
            continue;
        try {
            return decodeURIComponent(rest.join('='));
        }
        catch {
            return null;
        }
    }
    return null;
}
/**
 * Valida la cookie de sesión contra la BD. Devuelve el usuario asociado
 * o null si la sesión no existe / está revocada / expirada.
 */
async function authenticateSocket(socket) {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = parseCookie(cookieHeader, ACTIVE_COOKIE_NAME)
        ?? (isProduction ? null : parseCookie(cookieHeader, SESSION_COOKIE));
    if (!token)
        return null;
    const tokenHash = hashToken(token);
    const now = Date.now();
    const startOfTodayMs = getBogotaStartOfDayMs(now);
    const [rows] = await pool.execute(`SELECT u.id, u.role
     FROM auth_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > ?
       AND s.created_at >= ?
     LIMIT 1`, [tokenHash, now, startOfTodayMs]);
    if (!rows.length)
        return null;
    return { id: String(rows[0].id), role: String(rows[0].role) };
}
/**
 * Comprueba si el usuario puede ver un pedido concreto.
 *  - admin: siempre.
 *  - owner: el order.student_id coincide con su userId.
 */
async function canAccessOrder(userId, role, orderId) {
    if (role === 'admin')
        return true;
    if (!/^[a-z0-9-]{1,64}$/i.test(orderId))
        return false; // basic format guard
    const [rows] = await pool.execute('SELECT 1 FROM orders WHERE id = ? AND student_id = ? LIMIT 1', [orderId, userId]);
    return rows.length > 0;
}
/**
 * Initialize WebSocket server
 */
export function initWebSocket(httpServer) {
    // Derivamos la lista de origins del env (mismas reglas que CORS HTTP).
    // Si CORS_ORIGIN no está definido, NO permitimos conexiones cross-origin
    // (solo same-origin, que es lo correcto en prod cuando front y back
    // viven en el mismo subdominio).
    const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
        .split(',')
        .map((o) => o.trim().replace(/\/+$/, ''))
        .filter(Boolean);
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: allowedOrigins.length ? allowedOrigins : false, // false = same-origin only
            credentials: true,
        },
    });
    // ── Middleware de autenticación para TODAS las conexiones ───────────
    io.use(async (socket, next) => {
        try {
            const user = await authenticateSocket(socket);
            if (!user) {
                return next(new Error('Unauthorized: session cookie missing or invalid'));
            }
            socket.data = { userId: user.id, role: user.role };
            next();
        }
        catch (err) {
            console.error('[WebSocket] Auth error:', err);
            next(new Error('Unauthorized: auth backend error'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        const authed = socket;
        const { userId, role } = authed.data;
        console.log(`[WebSocket] Cliente conectado: ${socket.id} (user=${userId}, role=${role})`);
        // Auto-join a la sala personal del usuario autenticado.
        socket.join(`user:${userId}`);
        if (!connectedUsers.has(userId))
            connectedUsers.set(userId, []);
        connectedUsers.get(userId).push(socket.id);
        // Auto-join a la sala de admins si el rol lo permite.
        if (role === 'admin') {
            socket.join('admin-notifications');
            console.log(`[WebSocket] Admin ${userId} auto-joined admin-notifications`);
        }
        // join-order: el cliente puede pedir unirse a UNA orden,
        // pero solo si le pertenece o es admin.
        socket.on('join-order', async (orderId, ack) => {
            try {
                if (typeof orderId !== 'string') {
                    ack?.({ ok: false, error: 'invalid orderId' });
                    return;
                }
                const allowed = await canAccessOrder(userId, role, orderId);
                if (!allowed) {
                    ack?.({ ok: false, error: 'forbidden' });
                    return;
                }
                socket.join(`order:${orderId}`);
                ack?.({ ok: true });
                console.log(`[WebSocket] User ${userId} joined order:${orderId}`);
            }
            catch (err) {
                console.error('[WebSocket] join-order error:', err);
                ack?.({ ok: false, error: 'internal' });
            }
        });
        // join-admin rechazado: los admins ya se unieron automáticamente al
        // conectar. Bloqueamos unión manual de no-admins.
        socket.on('join-admin', (ack) => {
            if (role !== 'admin') {
                ack?.({ ok: false, error: 'forbidden' });
                return;
            }
            ack?.({ ok: true });
        });
        // join-user rechazado: el user ya está en su sala automáticamente.
        // El cliente no necesita su propio userId de vuelta (ya lo tiene en
        // su auth context) y mandárselo en el ack es un mini-leak evitable.
        socket.on('join-user', (ack) => {
            ack?.({ ok: true });
        });
        // Disconnect handler
        socket.on('disconnect', () => {
            console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
            const sockets = connectedUsers.get(userId);
            if (sockets) {
                const index = sockets.indexOf(socket.id);
                if (index > -1) {
                    sockets.splice(index, 1);
                    if (sockets.length === 0)
                        connectedUsers.delete(userId);
                }
            }
        });
        // Debug: ping-pong
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });
    });
    console.log('[WebSocket] Servidor iniciado (autenticación por cookie activa)');
    return io;
}
/**
 * Send notification to specific user
 */
export function notifyUser(userId, event, data) {
    if (!io) {
        console.warn('[WebSocket] Server no inicializado. Notificación no enviada.');
        return;
    }
    io.to(`user:${userId}`).emit(event, data);
    console.log(`[WebSocket] Notificación enviada a usuario ${userId}: ${event}`);
}
/**
 * Send notification to order subscribers
 */
export function notifyOrder(orderId, event, data) {
    if (!io) {
        console.warn('[WebSocket] Server no inicializado. Notificación de orden no enviada.');
        return;
    }
    io.to(`order:${orderId}`).emit(event, data);
    console.log(`[WebSocket] Notificación de orden enviada: ${orderId} - ${event}`);
}
/**
 * Send notification to all admins
 */
export function notifyAdmins(event, data) {
    if (!io) {
        console.warn('[WebSocket] Server no inicializado. Notificación admin no enviada.');
        return;
    }
    io.to('admin-notifications').emit(event, data);
    console.log(`[WebSocket] Notificación enviada a todos los admins: ${event}`);
}
/**
 * Broadcast to all connected clients
 */
export function broadcastMessage(event, data) {
    if (!io) {
        console.warn('[WebSocket] Server no inicializado. Broadcast no enviado.');
        return;
    }
    io.emit(event, data);
    console.log(`[WebSocket] Broadcast enviado: ${event}`);
}
/**
 * Get WebSocket server instance
 */
export function getWebSocketServer() {
    return io;
}
/**
 * Get connected users count
 */
export function getConnectedUsersCount() {
    return connectedUsers.size;
}
/**
 * Close WebSocket server
 */
export async function closeWebSocket() {
    if (io) {
        io.close();
        connectedUsers.clear();
        console.log('[WebSocket] Servidor cerrado');
    }
}
