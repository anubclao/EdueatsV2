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

const dbHost = asEnvString(process.env.DB_HOST) || 'localhost';
const dbUser = asEnvString(process.env.DB_USER) || 'root';
const dbName = asEnvString(process.env.DB_NAME) || 'edueat';
const dbPass = asEnvString(process.env.DB_PASS) || asEnvString(process.env.DB_PASSWORD);

const dbConfig = {
  host: dbHost,
  port: Number(asEnvString(process.env.DB_PORT) || 3306),
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
  ssl: isTruthy(process.env.DB_SSL)
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
    ssl: Boolean(dbConfig.ssl),
    connectionLimit: dbConfig.connectionLimit,
    queueLimit: dbConfig.queueLimit,
    connectTimeout: dbConfig.connectTimeout,
  })
);

export const pool = mysql.createPool(dbConfig);

// Force collation on every new connection to avoid utf8mb4_uca1400_ai_ci vs utf8mb4_unicode_ci mismatch (Hostinger MariaDB 10.6+)
pool.on('connection', (connection) => {
  connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
});

export default pool;
