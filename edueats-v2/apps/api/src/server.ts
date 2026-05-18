import { config } from 'dotenv';
import http from 'http';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { initQueues, closeQueues } from './services/queue.js';
import { initWebSocket, closeWebSocket } from './services/websocket.js';

config();

const app = createApp();
const isProduction = process.env.NODE_ENV === 'production';
const configuredPort = Number(
  process.env.PORT ?? process.env.HOSTINGER_PORT ?? (isProduction ? 8080 : 3001)
);
let port = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : isProduction ? 8080 : 3001;

// Common misconfiguration in shared env panels: PORT accidentally set to default MySQL port.
if (port === 3306) {
  console.warn(
    `[WARN] PORT=${port} parece ser puerto de MySQL. Ajustando a ${isProduction ? 8080 : 3001}. ` +
    `Configura PORT correctamente en el panel de hosting.`
  );
  port = isProduction ? 8080 : 3001;
}

const server = http.createServer(app);

const gracefulShutdown = async () => {
  console.log('[shutdown] Iniciando cierre graceful...');

  server.close(async () => {
    console.log('[shutdown] HTTP server cerrado');

    try {
      await pool.end();
      console.log('[shutdown] MySQL pool cerrado');
    } catch (err) {
      console.error('[shutdown] Error cerrando MySQL:', err);
    }

    try {
      await closeQueues();
      console.log('[shutdown] Queues cerradas');
    } catch (err) {
      console.error('[shutdown] Error cerrando queues:', err);
    }

    try {
      await closeWebSocket();
      console.log('[shutdown] WebSocket cerrado');
    } catch (err) {
      console.error('[shutdown] Error cerrando WebSocket:', err);
    }

    console.log('[shutdown] Proceso finalizado');
    process.exit(0);
  });
};

async function startServer() {
  try {
    // Initialize in-memory queue facade
    await initQueues();

    // Initialize WebSocket on HTTP server
    initWebSocket(server);

    server.listen(port, '0.0.0.0', () => {
      console.log(`EduEats API v2 running on http://0.0.0.0:${port}`);

      pool
        .query('SELECT 1')
        .then(() => {
          console.log('[startup] MySQL connection OK');
        })
        .catch((error) => {
          console.error('[startup] MySQL connection failed:', error);
        });
    });

    server.on('error', (error) => {
      console.error('[startup] HTTP server failed to bind:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('[startup] Fatal startup error:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('[startup] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[startup] Uncaught exception:', error);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

void startServer();
