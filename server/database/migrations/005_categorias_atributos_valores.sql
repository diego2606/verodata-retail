-- ============================================================
-- Migración 005 — valores sugeridos de atributo por categoría (HU030)
-- Mapa JSONB { "COLOR": ["Negro","Blanco"], "SIZE": ["38","40"] }.
-- NULL = heredar del ancestro más cercano. Idempotente.
-- ============================================================

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS atributos_valores JSONB;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categorias'
ORDER BY ordinal_position;
