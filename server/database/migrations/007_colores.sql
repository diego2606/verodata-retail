-- ============================================================
-- Migración 007 — catálogo de colores (HU032)
-- Nombre → hex para pintar el swatch en el storefront.
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS colores (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(60) NOT NULL UNIQUE,
    slug       VARCHAR(80) NOT NULL UNIQUE,
    hex        VARCHAR(7) NOT NULL,
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'colores'
ORDER BY ordinal_position;
