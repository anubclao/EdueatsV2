/**
 * Backup manual de la BD local `edueat` (o la que diga DB_NAME).
 * NO usa mysqldump — usa mysql2 para hacer un dump portable a .sql.
 *
 * Output: ../backups/edueat_pre_multitenant_YYYYMMDD_HHMMSS.sql
 *
 * Uso:
 *   node scripts/migrations/backup_db.mjs
 *
 * El script:
 *   1. Conecta a la BD indicada en .env (DB_NAME).
 *   2. Vuelca CREATE TABLE + INSERT INTO para cada tabla.
 *   3. Restaura con: mysql -u root -p edueat < backups/edueat_pre_multitenant_*.sql
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const outDir = path.resolve(process.cwd(), '..', '..', 'backups');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
const outFile = path.join(outDir, `${process.env.DB_NAME || 'edueat'}_pre_multitenant_${stamp}.sql`);

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: false,
});

console.log(`[backup] Conectado a ${process.env.DB_NAME}@${process.env.DB_HOST}`);

const out = fs.createWriteStream(outFile, { encoding: 'utf8' });
const w = (line = '') => out.write(line + '\n');

w(`-- Backup de ${process.env.DB_NAME}`);
w(`-- Fecha: ${new Date().toISOString()}`);
w(`-- Generado por: scripts/migrations/backup_db.mjs`);
w();
w('SET FOREIGN_KEY_CHECKS=0;');
w('SET NAMES utf8mb4;');
w(`USE \`${process.env.DB_NAME}\`;`);
w();

const [tables] = await conn.query(
  `SELECT TABLE_NAME FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
  [process.env.DB_NAME]
);

let totalRows = 0;
for (const row of tables) {
  const table = row.TABLE_NAME;
  console.log(`[backup] Volcando ${table}...`);

  const [create] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  w(`-- ── ${table} ──`);
  w(`DROP TABLE IF EXISTS \`${table}\`;`);
  w(create[0]['Create Table'] + ';');
  w();

  const [data] = await conn.query(`SELECT * FROM \`${table}\``);
  if (data.length > 0) {
    const cols = Object.keys(data[0]);
    const colList = cols.map(c => `\`${c}\``).join(', ');
    w(`INSERT INTO \`${table}\` (${colList}) VALUES`);

    const values = data.map(r => {
      const vals = cols.map(c => {
        const v = r[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return String(v);
        if (typeof v === 'boolean') return v ? '1' : '0';
        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
        // string — escapar
        return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
      });
      return `  (${vals.join(', ')})`;
    });

    w(values.join(',\n') + ';');
    w();
    totalRows += data.length;
  }
}

w('SET FOREIGN_KEY_CHECKS=1;');
out.end();

await new Promise(resolve => out.on('close', resolve));
await conn.end();

const size = fs.statSync(outFile).size;
console.log(`\n[backup] ✅ Backup completo: ${outFile}`);
console.log(`[backup]    Tablas: ${tables.length} | Filas: ${totalRows} | Tamaño: ${(size / 1024).toFixed(1)} KB`);
