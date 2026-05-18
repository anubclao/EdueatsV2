import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../../.env') });

const isTruthy = (value?: string) => /^(1|true|yes|on|required)$/i.test(value ?? '');
const asEnvString = (value?: string) => (value ?? '').trim().replace(/^['\"]|['\"]$/g, '');
const asPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(asEnvString(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const databaseUrl = asEnvString(process.env.DATABASE_URL);

const fromUrl = (() => {
  if (!databaseUrl) return null;
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
      ssl: /ssl=true/i.test(url.search),
    };
  } catch (error) {
    console.error('[db] DATABASE_URL invalida:', error);
    return null;
  }
})();

const dbHost = asEnvString(process.env.DB_HOST) || fromUrl?.host || '127.0.0.1';
const dbPort = Number(asEnvString(process.env.DB_PORT) || fromUrl?.port || 3306);
const dbUser = asEnvString(process.env.DB_USER) || fromUrl?.user || 'root';
const dbName = asEnvString(process.env.DB_NAME) || fromUrl?.database || 'edueat';
const dbPass =
  asEnvString(process.env.DB_PASS) ||
  asEnvString(process.env.DB_PASSWORD) ||
  fromUrl?.password ||
  '';

const dbConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPass,
  database: dbName,
  charset: 'UTF8MB4_UNICODE_CI',
  waitForConnections: true,
  connectionLimit: asPositiveInt(process.env.DB_POOL_CONNECTION_LIMIT, 20),
  queueLimit: asPositiveInt(process.env.DB_POOL_QUEUE_LIMIT, 0),
  connectTimeout: Number(asEnvString(process.env.DB_CONNECT_TIMEOUT_MS) || 10000),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: isTruthy(process.env.DB_SSL) || Boolean(fromUrl?.ssl)
    ? {
        rejectUnauthorized: !/^false$/i.test(process.env.DB_SSL_REJECT_UNAUTHORIZED ?? ''),
      }
    : undefined,
};

console.log(
  '[db] Config:',
  JSON.stringify({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    source: databaseUrl ? 'DATABASE_URL/DB_*' : 'DB_*',
    ssl: Boolean(dbConfig.ssl),
    connectionLimit: dbConfig.connectionLimit,
    queueLimit: dbConfig.queueLimit,
    connectTimeout: dbConfig.connectTimeout,
  })
);

export const pool = mysql.createPool(dbConfig);

// Force collation on every acquired connection to avoid
// utf8mb4_uca1400_ai_ci vs utf8mb4_unicode_ci mismatch (Hostinger MariaDB 10.6+).
// pool.on('connection') is non-blocking, so we wrap getConnection instead.
const _getConnection = pool.getConnection.bind(pool);
pool.getConnection = async () => {
  const conn = await _getConnection();
  await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  return conn;
};

export default pool;
