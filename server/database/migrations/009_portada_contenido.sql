-- ============================================================
-- Migración 009 — contenido de portada (HU034)
-- Crea: ENUM banner_ubicacion_enum, tablas `banners` y `sitio_config`
--       y columnas de curaduría `destacado` / `destacado_orden` en `productos`.
-- Ejecutar en: Supabase Dashboard > SQL Editor  (o vía pool)
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

-- 1. ENUM de ubicación del contenido editorial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'banner_ubicacion_enum') THEN
        CREATE TYPE banner_ubicacion_enum AS ENUM ('HERO', 'BANDA_EDITORIAL', 'TICKER');
    END IF;
END $$;

-- 2. Tabla de banners (hero, banda editorial y cintillo)
CREATE TABLE IF NOT EXISTS banners (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ubicacion      banner_ubicacion_enum NOT NULL,
    titulo         VARCHAR(150) NOT NULL,
    subtitulo      VARCHAR(255),
    cta_texto      VARCHAR(40),
    cta_url        VARCHAR(255),
    imagen_url     TEXT NOT NULL,
    orden          INTEGER NOT NULL DEFAULT 0,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    vigente_desde  TIMESTAMP WITH TIME ZONE,
    vigente_hasta  TIMESTAMP WITH TIME ZONE,
    creado_en      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_banners_ubicacion
    ON banners(ubicacion, activo, orden);

-- 3. Configuración y franjas globales de la tienda (textos editables)
CREATE TABLE IF NOT EXISTS sitio_config (
    clave          VARCHAR(60) PRIMARY KEY,
    valor          JSONB NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Curaduría de productos en la portada
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS destacado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS destacado_orden INTEGER;

CREATE INDEX IF NOT EXISTS idx_productos_destacado
    ON productos(destacado, destacado_orden);

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'banners'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sitio_config'
ORDER BY ordinal_position;
