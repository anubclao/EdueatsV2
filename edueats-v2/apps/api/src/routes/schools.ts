/**
 * Schools router — gestión de colegios (tenants).
 *
 * Por ahora expuesto sin auth, asumiendo que solo el operador de la
 * plataforma (vos) tiene acceso al deployment. En la próxima iteración
 * vamos a cerrar este endpoint detrás de un super-admin.
 *
 * Crear un colegio dispara un seed mínimo:
 *   - Fila en `schools`.
 *   - Categorías base (starter, soup, main, vegetarian, dessert, snack, general).
 *   - Variable global `schoolName`.
 *   - Roles base (idempotente: reusa los roles globales).
 *
 * NO crea admin del colegio automáticamente — eso lo hace el endpoint
 * `POST /api/users/register` con el schoolId en el body.
 */

import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { invalidateCategoriesCache, invalidateRecipesCache } from '../services/cache-helpers.js';

export const schoolsRouter = Router();

// Todos los endpoints de gestión de colegios requieren auth de admin.
// Antes estaban abiertos bajo el supuesto de "solo el operador tiene acceso
// al deployment" — eso era aceptable en single-tenant pero con el endpoint
// expuesto en Hostinger cualquiera con curl podía listar/crear colegios.
// Fix: cerrar detrás de admin auth.
schoolsRouter.use(requireAuth, requireRoles('admin'));

const createSchoolSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-z0-9][a-z0-9-_]*$/i, 'ID inválido'),
  name: z.string().trim().min(1).max(150),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9-]*$/, 'slug inválido'),
  domain: z.string().trim().max(150).optional(),
  logoUrl: z.string().trim().url().max(255).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const BASE_CATEGORIES: Array<[string, string, number]> = [
  ['starter',    'Entrada',             1],
  ['soup',       'Sopa',                2],
  ['main',       'Plato Fuerte',        3],
  ['vegetarian', 'Vegetariano',         4],
  ['dessert',    'Postre',              5],
  ['snack',      'Refrigerio',          6],
  ['general',    'General',             7],
];

schoolsRouter.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, domain, logo_url as logoUrl, is_active as isActive, settings, created_at as createdAt, updated_at as updatedAt FROM schools ORDER BY name'
    ) as any[];
    res.json(rows.map((r: any) => ({
      ...r,
      isActive: Boolean(r.isActive),
      settings: typeof r.settings === 'string' ? JSON.parse(r.settings) : (r.settings ?? null),
    })));
  } catch (e: any) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

schoolsRouter.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, domain, logo_url as logoUrl, is_active as isActive, settings FROM schools WHERE id=? LIMIT 1',
      [req.params.id]
    ) as any[];
    if (!rows.length) return res.status(404).json({ error: 'Colegio no encontrado.' });
    const r = rows[0];
    res.json({
      ...r,
      isActive: Boolean(r.isActive),
      settings: typeof r.settings === 'string' ? JSON.parse(r.settings) : (r.settings ?? null),
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

schoolsRouter.post('/', async (req, res) => {
  const parsed = createSchoolSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos de colegio inválidos.', details: parsed.error.flatten() });
  }
  const { id, name, slug, domain, logoUrl, settings } = parsed.data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Crear el colegio.
    await conn.execute(
      'INSERT INTO schools (id, name, slug, domain, logo_url, is_active, settings) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [id, name, slug, domain ?? null, logoUrl ?? null, settings ? JSON.stringify(settings) : null]
    );

    // 2. Sembrar categorías base.
    for (const [catId, catName, catOrder] of BASE_CATEGORIES) {
      await conn.execute(
        'INSERT IGNORE INTO categories (id, name, `order`, school_id) VALUES (?, ?, ?, ?)',
        [catId, catName, catOrder, id]
      );
    }

    // 3. Sembrar variable global del colegio.
    await conn.execute(
      'INSERT IGNORE INTO global_variables (id, name, value, is_system, school_id) VALUES (?, ?, ?, 0, ?)',
      ['schoolName', 'Colegio', name, id]
    );

    await conn.commit();

    // 4. Invalidar caches globales para que los nuevos colegios aparezcan.
    invalidateCategoriesCache();
    invalidateRecipesCache();

    res.status(201).json({ success: true, id });
  } catch (e: any) {
    await conn.rollback();
    if (e?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un colegio con ese ID o slug.' });
    }
    console.error('[schools] Error creando colegio:', e);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    conn.release();
  }
});

schoolsRouter.put('/:id', async (req, res) => {
  const { name, domain, logoUrl, isActive, settings } = req.body;
  try {
    await pool.execute(
      'UPDATE schools SET name=COALESCE(?, name), domain=?, logo_url=?, is_active=COALESCE(?, is_active), settings=? WHERE id=?',
      [name ?? null, domain ?? null, logoUrl ?? null, isActive === undefined ? null : (isActive ? 1 : 0),
       settings ? JSON.stringify(settings) : null, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});
