-- Migration: Add exclusive_group column to categories table
-- Run once against your MySQL/MariaDB database.

ALTER TABLE categories
  ADD COLUMN exclusive_group VARCHAR(64) NULL DEFAULT NULL
  COMMENT 'Categorías con el mismo valor son mutuamente excluyentes en el planificador de menú';
