-- ============================================================
-- Migración 002 — jerarquía de categorías (categoría padre)
-- HU006 (categorías jerárquicas). Idempotente.
-- ============================================================

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS categoria_padre_id INTEGER
        REFERENCES categorias(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categorias_padre ON categorias(categoria_padre_id);

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categorias'
ORDER BY ordinal_position;
