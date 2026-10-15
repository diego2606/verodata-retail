-- ============================================================
-- Migración 014 — sobre-título (eyebrow) de los banners de portada
-- Agrega `etiqueta` a `banners`: la línea pequeña que va encima del
-- titular (ej. "Nueva temporada", "Sobre título" de la banda editorial).
-- Ejecutar en: Supabase Dashboard > SQL Editor  (o vía pool)
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

ALTER TABLE banners ADD COLUMN IF NOT EXISTS etiqueta VARCHAR(80);

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'banners'
ORDER BY ordinal_position;
