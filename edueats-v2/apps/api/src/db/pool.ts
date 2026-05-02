import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../../.env') });

const isTruthy = (value?: string) => /^(1|true|yes|on|required)$/i.test(value ?? '');

const dbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME ?? 'edueat',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10000),
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
    connectTimeout: dbConfig.connectTimeout,
  })
);

export const pool = mysql.createPool(dbConfig);

export default pool;
