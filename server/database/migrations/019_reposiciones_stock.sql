-- ============================================================
-- Migración 019 — Abastecimiento y Reposición de Stock (HU036)
-- Crea: `proveedores`, `ordenes_reposicion`, `detalle_reposicion` y
-- `movimientos_inventario` (base del kardex, HU023).
--
-- El stock de la tienda vive en `inventario` (1:1 con el SKU `productos`):
-- una orden de reposición NO toca el stock al crearse, solo al recibirse.
-- Idempotente.
-- ============================================================

-- 1. TIPOS ENUMERADOS -----------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_reposicion_enum') THEN
        CREATE TYPE estado_reposicion_enum AS ENUM ('PENDIENTE', 'RECIBIDO', 'CANCELADO');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento_enum') THEN
        CREATE TYPE tipo_movimiento_enum AS ENUM ('ENTRADA_REPOSICION', 'SALIDA_VENTA', 'AJUSTE');
    END IF;
END $$;

-- 2. PROVEEDORES ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_empresa      VARCHAR(150) NOT NULL,
    contacto_nombre     VARCHAR(120),
    telefono            VARCHAR(30),
    email               VARCHAR(160),
    categoria_productos VARCHAR(120),
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_proveedor_nombre UNIQUE (nombre_empresa)
);

-- 3. ORDEN DE REPOSICIÓN (cabecera) ---------------------------------------
-- `costo_total` y `unidades_totales` los calcula el servicio y se insertan en
-- la misma transacción que el detalle (no son columnas generadas: agregan otra tabla).
CREATE TABLE IF NOT EXISTS ordenes_reposicion (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id          UUID NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
    estado                estado_reposicion_enum NOT NULL DEFAULT 'PENDIENTE',
    fecha_emision         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_estimada_arribo DATE,
    notas                 TEXT,
    costo_total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unidades_totales      INTEGER NOT NULL DEFAULT 0,
    usuario_id            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo_cancelacion    TEXT,
    recibido_en           TIMESTAMP WITH TIME ZONE,
    creado_en             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. DETALLE DE LA ORDEN --------------------------------------------------
-- `subtotal` se genera en la base (costo_unitario * cantidad_pedida).
CREATE TABLE IF NOT EXISTS detalle_reposicion (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id        UUID NOT NULL REFERENCES ordenes_reposicion(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    costo_unitario  NUMERIC(12, 2) NOT NULL CHECK (costo_unitario >= 0),
    cantidad_pedida INTEGER NOT NULL CHECK (cantidad_pedida > 0),
    subtotal        NUMERIC(12, 2) GENERATED ALWAYS AS (costo_unitario * cantidad_pedida) STORED,
    CONSTRAINT uq_detalle_orden_producto UNIQUE (orden_id, producto_id)
);

-- 5. MOVIMIENTOS DE INVENTARIO (kardex) -----------------------------------
-- `stock_resultante` guarda el stock del SKU inmediatamente después del movimiento.
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id      UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo             tipo_movimiento_enum NOT NULL,
    cantidad         INTEGER NOT NULL,
    stock_resultante INTEGER NOT NULL,
    referencia_tipo  VARCHAR(40),
    referencia_id    UUID,
    motivo           TEXT,
    usuario_id       UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. ÍNDICES DE RENDIMIENTO -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_proveedores_activo     ON proveedores(activo);
CREATE INDEX IF NOT EXISTS idx_ordenes_proveedor      ON ordenes_reposicion(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado         ON ordenes_reposicion(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha          ON ordenes_reposicion(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_orden          ON detalle_reposicion(orden_id);
CREATE INDEX IF NOT EXISTS idx_detalle_producto       ON detalle_reposicion(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto   ON movimientos_inventario(producto_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_referencia ON movimientos_inventario(referencia_id);
