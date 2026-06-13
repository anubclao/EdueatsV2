-- ============================================================
-- Migration 001: Multi-tenant — agregar tabla `schools` y columna
-- `school_id` a todas las tablas tenant-scoped.
--
-- OBJETIVO: permitir que múltiples colegios coexistan en la misma
-- base de datos, con aislamiento total de datos vía `school_id`.
--
-- ESTRATEGIA: shared DB, shared schema.
--  - Una sola fila en `schools` por colegio.
--  - Toda tabla tenant-scoped tiene `school_id` NOT NULL con FK a schools.
--  - El colegio "default" absorbe todos los datos existentes, así la
--    migración es 100% backwards-compatible con deployments en prod.
--
-- TABLAS TENANT-SCOPED (todas las que contienen datos del colegio):
--   users, categories, recipes, daily_menu_configs, daily_menu_items,
--   orders, order_items, recurring_preferences, recurring_preference_items,
--   system_notifications, survey_definitions, survey_results,
--   global_variables, generated_reports, auth_sessions, auth_otp_challenges,
--   category_rules
--
-- TABLAS NO TENANT (compartidas entre colegios o de plataforma):
--   schools (esta), roles (catálogo compartido)
-- ============================================================

-- ── 1. Crear tabla schools ───────────────────────────────────────────────
-- Detectamos la collation que ya usa la BD (MySQL 8 usa utf8mb4_0900_ai_ci,
-- MariaDB usa utf8mb4_unicode_ci, etc.) y la replicamos para que las FK
-- contra tablas existentes no fallen por mismatch de collation.
SET @target_collation := (SELECT T.TABLE_COLLATION FROM information_schema.TABLES T
                          WHERE T.TABLE_SCHEMA = DATABASE() AND T.TABLE_NAME = 'users' LIMIT 1);

SET @create_ddl := CONCAT(
  'CREATE TABLE IF NOT EXISTS schools (
    id          VARCHAR(64)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(80)  NOT NULL,
    domain      VARCHAR(150) NULL,
    logo_url    VARCHAR(255) NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    settings    JSON         NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_schools_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE ', @target_collation
);
PREPARE stmt FROM @create_ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Si schools ya existe con una collation distinta (intento previo fallido),
-- la convertimos a la collation de users.
SET @current_school_collation := (SELECT TABLE_COLLATION FROM information_schema.TABLES
                                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schools');
SET @convert_ddl := IF(@current_school_collation IS NOT NULL AND @current_school_collation <> @target_collation,
  CONCAT('ALTER TABLE schools CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @target_collation),
  'DO 0'
);
PREPARE stmt FROM @convert_ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 2. Sembrar el colegio "default" que absorbe los datos actuales ──────
INSERT IGNORE INTO schools (id, name, slug, is_active) VALUES
  ('default', 'EduEats School (Migración)', 'default', 1);

-- ── 3. Agregar school_id a tablas tenant-scoped ─────────────────────────
-- Usamos DEFAULT 'default' en cada ALTER para que las filas existentes
-- queden asignadas al colegio default sin perder datos.

-- users
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE users ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_users_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- categories
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE categories ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_categories_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_categories_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- recipes
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipes' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE recipes ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_recipes_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_recipes_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- daily_menu_configs
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_menu_configs' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE daily_menu_configs ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER date,
   ADD CONSTRAINT fk_dmc_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_dmc_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- daily_menu_items
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_menu_items' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE daily_menu_items ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER menu_date,
   ADD CONSTRAINT fk_dmi_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_dmi_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE orders ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_orders_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_orders_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- order_items
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE order_items ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER order_id,
   ADD CONSTRAINT fk_oi_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_oi_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- recurring_preferences
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurring_preferences' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE recurring_preferences ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER student_id,
   ADD CONSTRAINT fk_rp_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_rp_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- recurring_preference_items
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurring_preference_items' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE recurring_preference_items ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER student_id,
   ADD CONSTRAINT fk_rpi_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_rpi_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- system_notifications
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_notifications' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE system_notifications ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_sn_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_sn_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- survey_definitions
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey_definitions' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE survey_definitions ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_sd_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_sd_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- survey_results
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey_results' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE survey_results ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_sr_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_sr_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- global_variables
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'global_variables' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE global_variables ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_gv_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_gv_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- generated_reports
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'generated_reports' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE generated_reports ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_gr_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_gr_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- auth_sessions
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_sessions' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE auth_sessions ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER user_id,
   ADD CONSTRAINT fk_as_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_as_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- auth_otp_challenges
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_otp_challenges' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE auth_otp_challenges ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER user_id,
   ADD CONSTRAINT fk_aoc_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_aoc_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- category_rules
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category_rules' AND COLUMN_NAME = 'school_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE category_rules ADD COLUMN school_id VARCHAR(64) NOT NULL DEFAULT ''default'' AFTER id,
   ADD CONSTRAINT fk_cr_school FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE,
   ADD INDEX idx_cr_school (school_id)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- Verificación post-migración (corre a mano si querés):
--   SELECT TABLE_NAME, COLUMN_NAME
--   FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'school_id'
--   ORDER BY TABLE_NAME;
--
--   SELECT COUNT(*) AS total_schools FROM schools;
--   SELECT id, name, slug, is_active FROM schools;
-- ============================================================

-- ── C. Fix-up: tablas tenant con collation distinta a schools ────────────
-- Esto pasa cuando la tabla ya existía con una collation legacy (ej. la
-- migración previa de category_rules la creó con utf8mb4_unicode_ci).
-- Las convertimos a la collation de schools para que las FK funcionen.
-- Si category_rules ya tiene school_id agregado correctamente, este bloque
-- no hace nada (IF EXISTS chequea la collation de cada tabla).
SET @target_collation_fixup := (SELECT T.TABLE_COLLATION FROM information_schema.TABLES T
                               WHERE T.TABLE_SCHEMA = DATABASE() AND T.TABLE_NAME = 'schools' LIMIT 1);

-- category_rules
SET @cr_col := (SELECT TABLE_COLLATION FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category_rules');
SET @cr_ddl := IF(@cr_col IS NOT NULL AND @cr_col <> @target_collation_fixup,
  CONCAT('ALTER TABLE category_rules CONVERT TO CHARACTER SET utf8mb4 COLLATE ', @target_collation_fixup),
  'DO 0');
PREPARE stmt FROM @cr_ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- (Acá se podrían agregar más tablas con el mismo patrón si aparecen.)
