-- ============================================================
-- Migración 001 — descripción opcional en categorías (HU006 CA01)
-- Ejecutar en: Supabase Dashboard > SQL Editor  (o vía pool)
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categorias'
ORDER BY ordinal_position;
