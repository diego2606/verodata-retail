-- ============================================================
-- Migración 003 — variantes de producto (modelo + atributos)
-- Permite agrupar fichas que son el mismo modelo en distinto
-- color / talla / capacidad. Cada variante conserva su propio SKU.
-- Idempotente.
-- ============================================================

ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS modelo VARCHAR(255);

ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS atributos JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Un mismo modelo no repite la misma combinación exacta de atributos
CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_modelo_atributos
    ON productos(modelo, atributos);

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'productos'
ORDER BY ordinal_position;