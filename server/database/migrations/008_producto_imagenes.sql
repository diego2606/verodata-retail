-- ============================================================
-- Migración 008 — galería de imágenes por producto (HU033)
-- 1 principal + N adicionales por producto. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS producto_imagenes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id  UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    alt          VARCHAR(150),
    orden        INTEGER NOT NULL DEFAULT 0,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_producto_imagenes ON producto_imagenes(producto_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_producto_imagen_principal
    ON producto_imagenes(producto_id) WHERE es_principal;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'producto_imagenes'
ORDER BY ordinal_position;
