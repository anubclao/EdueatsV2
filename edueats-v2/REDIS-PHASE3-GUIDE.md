# EduEats v2 - Phase 3: Testing, Documentation, Distributed Sessions, Queue & WebSocket

## 📋 Resumen de Implementación

### ✅ 1. Testing - Redis Connection Verification
**Archivo:** `src/services/redis-test.ts`

Script de prueba para verificar conectividad y funcionalidad de Redis:
```bash
# Ejecutar pruebas
npm run test:redis
```

**Pruebas incluidas:**
- ✅ PING al servidor Redis
- ✅ Operaciones SET/GET básicas
- ✅ INCR para rate limiting
- ✅ Cache helpers (setCached/getCached)
- ✅ DEL para eliminar claves
- ✅ KEYS pattern matching
- ✅ Estadísticas de conexión

**Resultado esperado:**
```
✅ TODAS LAS PRUEBAS PASARON
```

---

### ✅ 2. Documentation - Environment Variables
**Archivo:** `.env.example`

Documentación completa de variables de entorno requeridas y opcionales:
```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/edueats

# Redis (Opcional - caché en memoria si no configurado)
REDIS_URL=redis://localhost:6379

# Sesiones distribuidas
SESSION_SECRET=tu-secreto-de-sesion-super-seguro

# Email
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-app

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=tu-secreto-jwt-super-seguro

# CORS
CORS_ORIGIN=http://localhost:5173

# WebSocket (Opcional)
WEBSOCKET_PORT=3001
```

---

### ✅ 3. Phase 2: Distributed Sessions with Redis
**Archivos:** 
- `src/middleware/sessions.ts` (nueva)
- `src/app.ts` (actualizado)

**Características:**
- ✅ Express-session configurado con Redis store
- ✅ Fallback a MemoryStore si Redis no disponible
- ✅ Cookies seguras (httpOnly, secure en producción, SameSite=Lax)
- ✅ TTL de 7 días
- ✅ Compatible con multi-instancia en producción

**Configuración:**
```typescript
// Automáticamente integrado en app.ts
// Si Redis no está disponible, usa MemoryStore
```

**Ventajas:**
- Sessions compartidas entre múltiples instancias de API
- Persistencia de sesiones entre reinicios
- Mejor seguridad en producción

---

### ✅ 4. Phase 3: Background Job Queue with BullMQ
**Archivos:**
- `src/services/queue.ts` (nueva)
- `src/services/email-queue-worker.ts` (nueva)
- `src/app.ts` (actualizado)
- `src/server.ts` (actualizado)

#### 4.1 Queue Service
**Propósito:** Gestionar colas de trabajos de fondo (emails, notificaciones)

**Funciones principales:**
```typescript
// Encolar email
await enqueueEmail('verification', {
  userId: '123',
  email: 'user@example.com',
  code: '123456'
});

// Encolar notificación
await enqueueNotification('order-placed', {
  userId: '456',
  orderId: 'ORDER-789',
  message: 'Tu pedido ha sido recibido'
});

// Ver estado
const status = await getQueueStatus();
// { emailQueue: 'active', emailQueueCounts: {...}, ... }
```

**Tipos de emails soportados:**
- `verification` - Email de verificación
- `confirmation` - Confirmación de pedido
- `reset` - Restablecer contraseña
- `notification` - Notificación personalizada

**Tipos de notificaciones:**
- `order-placed` - Pedido realizado
- `order-ready` - Pedido listo
- `order-delivered` - Pedido entregado
- `custom` - Personalizado

#### 4.2 Email Queue Worker
**Archivo:** `src/services/email-queue-worker.ts`

Worker separado que procesa trabajos de email:
```bash
# En desarrollo
npm run dev:worker

# En producción
npm run start:worker
```

**Características:**
- ✅ Procesa 3 emails concurrentes
- ✅ Reintentos automáticos (3 intentos con backoff exponencial)
- ✅ Fallback a simulación si EMAIL_USER/EMAIL_PASSWORD no configurados
- ✅ Usa nodemailer + Gmail
- ✅ Manejo graceful de SIGTERM

**Templates de email:**
- Verificación (code)
- Confirmación (orderId, deliveryDate, totalPrice)
- Restablecer contraseña (resetLink)
- Notificación personalizada (subject, html)

---

### ✅ 5. Phase 3: Real-Time Notifications with WebSocket
**Archivos:**
- `src/services/websocket.ts` (nueva)
- `src/server.ts` (actualizado)

#### 5.1 WebSocket Server
**Propósito:** Notificaciones en tiempo real a clientes

**Eventos disponibles:**

```typescript
// Frontend conecta
socket.emit('join-user', userId);
socket.emit('join-order', orderId);
socket.emit('join-admin');

// Backend envía notificaciones
notifyUser(userId, 'order-status', { status: 'ready' });
notifyOrder(orderId, 'update', { message: 'Pedido listo' });
notifyAdmins('new-order', { orderId: '123' });
broadcastMessage('system-alert', { message: '...' });
```

**Características:**
- ✅ Socket.IO con Redis adapter para multi-instancia
- ✅ Salas por usuario, por orden, admin
- ✅ CORS configurado
- ✅ Graceful shutdown

**Frontend Integration (React):**
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  withCredentials: true
});

// Unirse a sala de usuario
socket.emit('join-user', userId);

// Escuchar notificaciones
socket.on('order-status', (data) => {
  console.log('Orden actualizada:', data);
});

// Ping-pong (test)
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Latencia:', Date.now() - data.timestamp, 'ms');
});
```

---

## 📦 Nuevas Dependencias

```json
{
  "express-session": "^1.18.0",
  "connect-redis": "^7.1.1",
  "@types/express-session": "^1.17.10",
  "bullmq": "^5.19.5",
  "socket.io": "^4.7.2",
  "@socket.io/redis-adapter": "^7.2.0"
}
```

---

## 🚀 Startup Command (Multi-Process Setup)

```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Email Queue Worker (opcional)
npm run dev:worker

# Testing Redis
npm run test:redis
```

---

## 📊 Production Deployment Checklist

- [ ] Configurar REDIS_URL con servidor Redis persistente
- [ ] Configurar SESSION_SECRET con string aleatorio seguro
- [ ] Configurar EMAIL_USER y EMAIL_PASSWORD
- [ ] Configurar JWT_SECRET
- [ ] Configurar CORS_ORIGIN con dominios permitidos
- [ ] Ejecutar API: `npm run start`
- [ ] Ejecutar Worker (separado): `npm run start:worker`
- [ ] Verificar Redis con: `npm run test:redis`

---

## 🔄 Graceful Shutdown

Ambos procesos (API y Worker) manejan SIGTERM/SIGINT correctamente:
```bash
# Cierra HTTP server → MySQL pool → Queues → WebSocket → Redis
# Sin perder trabajos en progreso
```

---

## 📝 Notas de Arquitectura

### Patrón Multi-Instancia
- Sessions: Almacenadas en Redis → compartidas entre instancias
- WebSocket: Usa Redis adapter → mensajes entre instancias
- Queues: Un único worker procesa trabajos desde Redis

### Fallback Graceful
- Si Redis no disponible:
  - ✅ Sessions usan MemoryStore (desarrollo)
  - ✅ Queues deshabilitadas (log warning)
  - ✅ WebSocket funciona sin adapter
  - ✅ Rate limiting usa memory store

### Performance
- Cache: 1-6 horas TTL (menus, recipes, categories)
- Rate limit: 200 req/min global, 10 req/15min en auth
- WebSocket: Reconnect automático, exponential backoff
- Email: 3 reintentos, 2s delay inicial

---

## 🔍 Monitoreo

```bash
# Ver status de queues
curl http://localhost:3000/api/health

# Ver usuarios conectados (WebSocket)
// En código: getConnectedUsersCount()

# Ver estadísticas Redis
npm run test:redis
```

---

## 📚 Referencias

- [Express-Session](https://github.com/expressjs/session)
- [Connect-Redis](https://github.com/tj/connect-redis)
- [BullMQ](https://docs.bullmq.io/)
- [Socket.IO](https://socket.io/docs/)
- [Socket.IO Redis Adapter](https://github.com/socketio/socket.io-redis)
