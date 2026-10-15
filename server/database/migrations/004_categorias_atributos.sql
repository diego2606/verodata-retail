-- ============================================================
-- Migración 004 — atributos permitidos por categoría (HU029)
-- Cada categoría puede definir su propio conjunto de atributos de
-- variante. NULL = heredar del ancestro más cercano (o fallback).
-- Idempotente.
-- ============================================================

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS atributos_permitidos TEXT[];

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categorias'
ORDER BY ordinal_position;
