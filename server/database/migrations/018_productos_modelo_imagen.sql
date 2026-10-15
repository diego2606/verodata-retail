-- ============================================================
-- Migración 018 — Portada del Producto Padre (Modelo)
-- HU035 / HU033: el Modelo gana una columna `imagen_url` que se sincroniza
-- con su imagen principal (igual que `productos.imagen_url`).
-- Idempotente.
-- ============================================================

ALTER TABLE productos_modelo ADD COLUMN IF NOT EXISTS imagen_url TEXT;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'productos_modelo'
  AND column_name = 'imagen_url';
