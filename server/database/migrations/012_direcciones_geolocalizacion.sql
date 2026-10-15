-- ============================================================
-- Migración 012 — geolocalización de direcciones (HU017)
-- Agrega `latitud` y `longitud` opcionales a `direcciones` para
-- guardar la ubicación exacta elegida en el mapa (Google Maps).
-- Sirve de base para compartir el punto de entrega con el reparto.
-- Ejecutar en: Supabase Dashboard > SQL Editor  (o vía pool)
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS latitud  DOUBLE PRECISION;
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;

-- Rangos válidos del sistema de coordenadas geográficas (WGS 84).
ALTER TABLE direcciones
    DROP CONSTRAINT IF EXISTS chk_direcciones_latitud,
    DROP CONSTRAINT IF EXISTS chk_direcciones_longitud;

ALTER TABLE direcciones
    ADD CONSTRAINT chk_direcciones_latitud
        CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90)),
    ADD CONSTRAINT chk_direcciones_longitud
        CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180));

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'direcciones'
ORDER BY ordinal_position;
