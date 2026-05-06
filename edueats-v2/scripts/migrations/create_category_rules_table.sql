-- Migration: Create category_rules table
-- The backend auto-creates this table on first boot via CREATE TABLE IF NOT EXISTS.
-- Run this script only if you need to create it manually or pre-populate.

CREATE TABLE IF NOT EXISTS category_rules (
  id VARCHAR(80) PRIMARY KEY,
  trigger_category_id VARCHAR(64) NOT NULL,
  effect ENUM('blocks','requires') NOT NULL,
  target_category_id VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_rule (trigger_category_id, effect, target_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
