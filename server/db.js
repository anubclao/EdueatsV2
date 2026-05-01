import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'edueat',

  // ── Gestión de conexiones ──────────────────────────────────────────────
  waitForConnections: true,        // encola peticiones cuando el pool está lleno
  connectionLimit:    Number(process.env.DB_POOL_LIMIT)   || 20, // máx conexiones simultáneas
  maxIdle:            Number(process.env.DB_POOL_MAX_IDLE) || 10, // conexiones idle a mantener
  idleTimeout:        Number(process.env.DB_POOL_IDLE_MS)  || 60_000, // ms antes de cerrar idle
  queueLimit:         Number(process.env.DB_POOL_QUEUE)    || 100, // máx peticiones en cola (0=ilimitado)
  connectTimeout:     Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10_000, // ms para establecer conexión

  // ── Keep-alive: evita cortes por MySQL wait_timeout ───────────────────
  enableKeepAlive:        true,
  keepAliveInitialDelay:  30_000, // ping inicial a los 30 s de inactividad

  // ── Formato de fechas ─────────────────────────────────────────────────
  dateStrings: true, // devuelve DATE/DATETIME como string YYYY-MM-DD
});

// ── Logging de eventos del pool ────────────────────────────────────────
pool.on('connection', (conn) => {
  console.log(`[DB] Nueva conexión establecida (threadId=${conn.threadId})`);
});

pool.on('acquire', (conn) => {
  if (process.env.DB_DEBUG === 'true')
    console.log(`[DB] Conexión adquirida del pool (threadId=${conn.threadId})`);
});

pool.on('release', (conn) => {
  if (process.env.DB_DEBUG === 'true')
    console.log(`[DB] Conexión devuelta al pool (threadId=${conn.threadId})`);
});

pool.on('enqueue', () => {
  console.warn('[DB] Sin conexiones libres — petición encolada');
});

// ── Health-check: verifica conectividad al iniciar ─────────────────────
export async function checkDbConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    console.log('[DB] Pool de conexiones listo ✓');
  } catch (err) {
    console.error('[DB] Error al conectar con la base de datos:', err.message);
    throw err;
  } finally {
    conn?.release();
  }
}

// ── Graceful shutdown: libera el pool al cerrar el proceso ─────────────
async function closePool(signal) {
  console.log(`\n[DB] Señal ${signal} recibida — cerrando pool de conexiones…`);
  try {
    await pool.end();
    console.log('[DB] Pool cerrado correctamente.');
  } catch (err) {
    console.error('[DB] Error al cerrar el pool:', err.message);
  }
  process.exit(0);
}

process.once('SIGINT',  () => closePool('SIGINT'));
process.once('SIGTERM', () => closePool('SIGTERM'));

export default pool;
