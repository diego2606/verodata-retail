-- ============================================================
-- Migración 006 — SKU estructurado por categoría (HU031)
-- Prefijo de categoría (ej. TEC) y orden de segmentos de la plantilla
-- (ej. {CATEGORIA,BRAND,MODEL,STORAGE_CAPACITY,COLOR}). Idempotente.
-- ============================================================

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS sku_prefijo VARCHAR(6);

ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS sku_segmentos TEXT[];

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categorias'
ORDER BY ordinal_position;
