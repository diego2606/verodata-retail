-- ============================================================
-- Migración 013 — categorías: permitir nombres repetidos por departamento
-- Con la taxonomía curada (Hombre/Mujer/…), una sección como "Ropa" debe poder
-- existir bajo varios departamentos. La unicidad se mantiene por `slug` (ruta).
-- Idempotente.
-- ============================================================

ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nombre_key;
DROP INDEX IF EXISTS categorias_nombre_key;

-- Verificación
SELECT conname FROM pg_constraint WHERE conrelid = 'categorias'::regclass AND contype = 'u';
