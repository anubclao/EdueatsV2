import { io, Socket } from 'socket.io-client';

const getSocketBaseUrl = () => {
  const metaValue = document
    .querySelector('meta[name="edueats-api-base"]')
    ?.getAttribute('content')
    ?.trim();

  const windowValue = (window as Window & { __EDUEATS_API_BASE__?: string }).__EDUEATS_API_BASE__?.trim();
  const configuredBase = windowValue || metaValue || '';

  if (!configuredBase) return window.location.origin;
  const normalized = configuredBase.replace(/\/+$/, '').replace(/\/api$/, '');
  return normalized;
};

let socket: Socket | null = null;

export function connectRealtime(_userId: string, _role?: string) {
  if (!socket) {
    socket = io(getSocketBaseUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect_error', (error) => {
      console.warn('[realtime] Error de conexion websocket:', error.message);
    });
  }

  // El servidor une automáticamente al usuario a su sala y (si es admin)
  // a la sala de notificaciones. Los emits de join-user/join-admin ya no
  // son necesarios: el server los rechaza silenciosamente o no hace nada.

  return socket;
}

export function joinOrderRoom(orderId: string) {
  if (!socket) return;
  // El servidor valida que el socket autenticado sea dueño del pedido
  // o admin; si no, ignora silenciosamente.
  socket.emit('join-order', orderId, (response: { ok: boolean; error?: string } | undefined) => {
    if (response && response.ok === false) {
      console.warn('[realtime] join-order rechazado:', response.error);
    }
  });
}

export function onRealtime<T = unknown>(event: string, handler: (payload: T) => void) {
  if (!socket) return () => undefined;
  socket.on(event, handler);
  return () => {
    socket?.off(event, handler);
  };
}

export function disconnectRealtime() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

export function getRealtimeSocket() {
  return socket;
}
