import { Router } from 'express';
import { randomBytes } from 'crypto';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { getCachedCategoryRules, invalidateCategoryRulesCache } from '../services/cache-helpers.js';

export const categoryRulesRouter = Router();

// Ensure table exists on first use
//
// DECISIÓN DE DISEÑO: `category_rules` es GLOBAL de plataforma (no tiene
// school_id). Las reglas de bloqueo/requerido entre categorías son comunes
// a toda la red de colegios (ej: "Vegetariano bloquea Sopa" aplica en
// cualquier colegio porque son categorías base del seed inicial). Agregar
// school_id sería over-engineering para una tabla que raramente cambia y
// que admin plataforma controla desde un único lugar. Si en el futuro un
// colegio quiere reglas custom, se agrega `school_id` con migración
// backwards-compatible (DEFAULT NULL = regla global).
//
// Referencia: wiki/concepts/security-audit.md (P1 #10).
const ensureTable = pool.query(`
  CREATE TABLE IF NOT EXISTS category_rules (
    id VARCHAR(80) PRIMARY KEY,
    trigger_category_id VARCHAR(64) NOT NULL,
    effect ENUM('blocks','requires') NOT NULL,
    target_category_id VARCHAR(64) NOT NULL,
    UNIQUE KEY uq_rule (trigger_category_id, effect, target_category_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`).catch(e => console.error('[category-rules] Error creando tabla:', e.message));

categoryRulesRouter.get('/', async (_req, res) => {
  await ensureTable;
  try {
    const rows = await getCachedCategoryRules(() =>
      pool.query(
        'SELECT id, trigger_category_id AS triggerCategoryId, effect, target_category_id AS targetCategoryId FROM category_rules ORDER BY triggerCategoryId, effect'
      ).then(result => result[0])
    );
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});

categoryRulesRouter.post('/', requireAuth, requireRoles('admin'), async (req, res) => {
  await ensureTable;
  const { triggerCategoryId, effect, targetCategoryId } = req.body;
  if (!triggerCategoryId || !effect || !targetCategoryId) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }
  if (!['blocks', 'requires'].includes(effect)) {
    return res.status(400).json({ error: 'Efecto inválido.' });
  }
  if (triggerCategoryId === targetCategoryId) {
    return res.status(400).json({ error: 'La categoría desencadenante y la afectada no pueden ser la misma.' });
  }
  const id = randomBytes(12).toString('hex');
  try {
    await pool.execute(
      'INSERT INTO category_rules (id, trigger_category_id, effect, target_category_id) VALUES (?, ?, ?, ?)',
      [id, triggerCategoryId, effect, targetCategoryId]
    );
    await invalidateCategoryRulesCache();
    res.json({ success: true, id });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esta regla ya existe.' });
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

categoryRulesRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  await ensureTable;
  try {
    await pool.execute('DELETE FROM category_rules WHERE id=?', [req.params.id]);
    await invalidateCategoryRulesCache();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: 'Error interno del servidor.' }); }
});
