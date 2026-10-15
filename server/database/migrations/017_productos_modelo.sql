-- ============================================================
-- Migración 017 — Producto Padre (Modelo) y SKU Hijo (Variante)
-- Introducida por HU035.
--
-- Regla de negocio: el Modelo agrupa la información común (nombre base,
-- marca, categoría, imágenes) y NO tiene stock ni se vende directamente.
-- El SKU (fila de `productos`) es la unidad física, con su propio stock,
-- precio, SKU y código de barras.
--
-- Idempotente.
-- ============================================================

-- 1. PRODUCTO PADRE (MODELO)
CREATE TABLE IF NOT EXISTS productos_modelo (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id        INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre              VARCHAR(150) NOT NULL,
    marca               VARCHAR(80),
    modelo_codigo       VARCHAR(60),
    descripcion         TEXT,
    -- Ejes de variante elegidos por el operador (subconjunto de los atributos
    -- efectivos de la categoría, HU029).
    atributos_variantes TEXT[] NOT NULL DEFAULT '{}',
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    destacado           BOOLEAN NOT NULL DEFAULT FALSE,
    destacado_orden     INTEGER,
    creado_en           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modelo_categoria ON productos_modelo(categoria_id);
CREATE INDEX IF NOT EXISTS idx_modelo_activo    ON productos_modelo(activo);
CREATE INDEX IF NOT EXISTS idx_modelo_destacado ON productos_modelo(destacado, destacado_orden);

-- 2. SKU HIJO: `productos` pasa a colgar del modelo
ALTER TABLE productos ADD COLUMN IF NOT EXISTS modelo_id UUID
    REFERENCES productos_modelo(id) ON DELETE CASCADE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(50);

-- 2.1 Combinación canónica de atributos (llave de unicidad dura).
--     Las columnas generadas no admiten subconsultas -> función IMMUTABLE.
CREATE OR REPLACE FUNCTION combinar_atributos(a JSONB)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE(string_agg(key || '=' || value, '|' ORDER BY key), '')
  FROM jsonb_each_text(COALESCE(a, '{}'::jsonb));
$$;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS combinacion_atributos TEXT
    GENERATED ALWAYS AS (combinar_atributos(atributos)) STORED;

-- 3. HU035 CA03 — UNIQUE (modelo_id, combinacion_atributos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_modelo_combinacion
    ON productos (modelo_id, combinacion_atributos)
    WHERE modelo_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_codigo_barras
    ON productos (codigo_barras)
    WHERE codigo_barras IS NOT NULL;

-- 4. Imágenes generales del padre (la galería puede colgar del modelo).
ALTER TABLE producto_imagenes ADD COLUMN IF NOT EXISTS modelo_id UUID
    REFERENCES productos_modelo(id) ON DELETE CASCADE;
ALTER TABLE producto_imagenes ALTER COLUMN producto_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_imagen_principal_modelo
    ON producto_imagenes (modelo_id)
    WHERE es_principal AND modelo_id IS NOT NULL;

-- 5. Backfill: cada `modelo` de texto existente se promueve a fila de productos_modelo
--    y se enlazan sus SKUs. La columna `productos.modelo` se mantiene durante la
--    transición (el storefront todavía la lee) y queda deprecada.
INSERT INTO productos_modelo (categoria_id, nombre, activo)
SELECT DISTINCT p.categoria_id, p.modelo, TRUE
FROM productos p
WHERE p.modelo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM productos_modelo m
    WHERE m.nombre = p.modelo AND m.categoria_id = p.categoria_id
  );

UPDATE productos p
SET modelo_id = m.id
FROM productos_modelo m
WHERE p.modelo_id IS NULL
  AND p.modelo IS NOT NULL
  AND m.nombre = p.modelo
  AND m.categoria_id = p.categoria_id;

-- 5.2 Productos sin `modelo` (creados manualmente): cada uno estrena su propio
--     Producto Padre para no romper el editor (1 SKU = 1 Modelo).
DO $$
DECLARE
  r RECORD;
  nuevo_modelo UUID;
BEGIN
  FOR r IN
    SELECT id, categoria_id, nombre, descripcion, activo
    FROM productos
    WHERE modelo_id IS NULL
  LOOP
    INSERT INTO productos_modelo (categoria_id, nombre, descripcion, activo)
    VALUES (r.categoria_id, r.nombre, r.descripcion, r.activo)
    RETURNING id INTO nuevo_modelo;

    UPDATE productos SET modelo_id = nuevo_modelo WHERE id = r.id;
  END LOOP;
END $$;

SELECT (SELECT COUNT(*) FROM productos_modelo) AS modelos,
       (SELECT COUNT(*) FROM productos WHERE modelo_id IS NOT NULL) AS skus_enlazados,
       (SELECT COUNT(*) FROM productos WHERE modelo_id IS NULL) AS skus_sin_modelo;
