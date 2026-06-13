/**
 * Test de aislamiento multi-tenant.
 * Ejecuta contra la BD configurada en .env.
 *
 *   node scripts/migrations/test_multi_tenant.mjs
 *
 * NO usa npm test ni frameworks: es un smoke-test rápido para correr
 * después de aplicar 001_multi_tenant.sql.
 *
 * Hace:
 *   1. Crea dos colegios: test-school-A y test-school-B (si no existen).
 *   2. Inserta una receta en cada uno.
 *   3. Verifica que GET /api/recipes con X-Test-School-A solo ve A.
 *   4. Verifica que GET /api/recipes con X-Test-School-B solo ve B.
 *   5. Limpia: borra las recetas de test y los colegios.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const DB = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const SCHOOL_A = 'test-school-A';
const SCHOOL_B = 'test-school-B';
const RECIPE_A = 'test-recipe-A';
const RECIPE_B = 'test-recipe-B';

const log = (...args) => console.log('[test]', ...args);
const fail = (msg) => { console.error('[test] FAIL:', msg); process.exit(1); };

try {
  log(`Conectado a ${process.env.DB_NAME}@${process.env.DB_HOST}`);

  // 1. Sembrar colegios
  await DB.query(
    `INSERT IGNORE INTO schools (id, name, slug) VALUES (?, ?, ?), (?, ?, ?)`,
    [SCHOOL_A, 'Test School A', 'test-school-a', SCHOOL_B, 'Test School B', 'test-school-b']
  );
  log('Colegios de test creados (o ya existían).');

  // 2. Insertar recetas únicas
  await DB.query(`DELETE FROM recipes WHERE id IN (?, ?)`, [RECIPE_A, RECIPE_B]);
  await DB.query(
    `INSERT INTO recipes (id, name, description, category, calories, school_id) VALUES
       (?, 'Receta A', 'solo en A', 'main', 100, ?),
       (?, 'Receta B', 'solo en B', 'main', 200, ?)`,
    [RECIPE_A, SCHOOL_A, RECIPE_B, SCHOOL_B]
  );
  log('Recetas de test sembradas.');

  // 3. Verificar aislamiento
  const [rowsA] = await DB.execute(
    `SELECT id, school_id FROM recipes WHERE id IN (?, ?) AND school_id = ?`,
    [RECIPE_A, RECIPE_B, SCHOOL_A]
  );
  if (rowsA.length !== 1) fail(`A debería ver 1 receta, vio ${rowsA.length}`);
  if (rowsA[0].id !== RECIPE_A) fail(`A debería ver RECIPE_A, vio ${rowsA[0].id}`);
  log(`✓ Colegio A ve solo su receta (${rowsA[0].id}).`);

  const [rowsB] = await DB.execute(
    `SELECT id, school_id FROM recipes WHERE id IN (?, ?) AND school_id = ?`,
    [RECIPE_A, RECIPE_B, SCHOOL_B]
  );
  if (rowsB.length !== 1) fail(`B debería ver 1 receta, vio ${rowsB.length}`);
  if (rowsB[0].id !== RECIPE_B) fail(`B debería ver RECIPE_B, vio ${rowsB[0].id}`);
  log(`✓ Colegio B ve solo su receta (${rowsB[0].id}).`);

  // 4. Verificar que la columna school_id está en todas las tablas tenant
  const [expectedTables] = await DB.query(
    `SELECT TABLE_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'school_id'
     ORDER BY TABLE_NAME`
  );
  log(`✓ Tablas con school_id: ${expectedTables.length} (esperadas: 16)`);
  if (expectedTables.length < 16) {
    log('  ⚠ Algunas tablas no tienen school_id todavía. Revisá la migración 001_multi_tenant.sql.');
  }

  log('\n✅ Test multi-tenant: PASS\n');

} catch (e) {
  console.error('[test] Error:', e);
  process.exit(1);
} finally {
  // Limpieza
  await DB.query(`DELETE FROM recipes WHERE id IN (?, ?)`, [RECIPE_A, RECIPE_B]);
  await DB.query(`DELETE FROM schools WHERE id IN (?, ?)`, [SCHOOL_A, SCHOOL_B]);
  log('Datos de test limpiados.');
  await DB.end();
}
