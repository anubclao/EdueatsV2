import { config } from 'dotenv';
import { createApp } from './app.js';
import { pool } from './db/pool.js';

config();

const app = createApp();
const configuredPort = Number(process.env.PORT ?? 3001);
let port = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3001;

// Common misconfiguration in shared env panels: PORT accidentally set to default MySQL port.
if (port === 3306) {
  console.warn(
    `[WARN] PORT=${port} parece ser puerto de MySQL. Ajustando a 3001. ` +
    `Configura PORT correctamente en el panel de hosting.`
  );
  port = 3001;
}

app.listen(port, '0.0.0.0', () => {
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
