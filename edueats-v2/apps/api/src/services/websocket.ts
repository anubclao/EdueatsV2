/**
 * WebSocket Service for Real-Time Notifications
 * Allows clients to receive order updates, notifications, etc. in real-time
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;
const connectedUsers = new Map<string, string[]>(); // userId -> [socketIds]

/**
 * Initialize WebSocket server
 */
export function initWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
      credentials: true,
    },
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

    // User joins their personal room
    socket.on('join-user', (userId: string) => {
      socket.join(`user:${userId}`);
      if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, []);
      }
      connectedUsers.get(userId)!.push(socket.id);
      console.log(`[WebSocket] Usuario ${userId} se unió a su sala (${socket.id})`);
    });

    // Order tracking room
    socket.on('join-order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`[WebSocket] Cliente se unió a seguimiento de orden ${orderId}`);
    });

    // Admin notifications room
    socket.on('join-admin', (adminId: string) => {
      socket.join('admin-notifications');
      console.log(`[WebSocket] Admin ${adminId} se unió a notificaciones`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);

      // Remove from all user rooms
      connectedUsers.forEach((socketIds, userId) => {
        const index = socketIds.indexOf(socket.id);
        if (index > -1) {
          socketIds.splice(index, 1);
          if (socketIds.length === 0) {
            connectedUsers.delete(userId);
          }
        }
      });
    });

    // Debug: ping-pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  console.log('[WebSocket] Servidor iniciado');
  return io;
}

/**
 * Send notification to specific user
 */
export function notifyUser(userId: string, event: string, data: any) {
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
export function notifyOrder(orderId: string, event: string, data: any) {
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
export function notifyAdmins(event: string, data: any) {
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
export function broadcastMessage(event: string, data: any) {
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
export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount(): number {
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
