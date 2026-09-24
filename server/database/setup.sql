-- ============================================================
-- VeroData Retail — DDL Real (alineado al schema de Supabase)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ADVERTENCIA: Borra y recrea todas las tablas públicas del proyecto
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. LIMPIAR (solo entorno de desarrollo / primer setup)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS pedido_items   CASCADE;
DROP TABLE IF EXISTS pedidos        CASCADE;
DROP TABLE IF EXISTS inventario     CASCADE;
DROP TABLE IF EXISTS productos      CASCADE;
DROP TABLE IF EXISTS categorias     CASCADE;
DROP TABLE IF EXISTS datos_personales CASCADE;
DROP TABLE IF EXISTS usuarios       CASCADE;
DROP TABLE IF EXISTS roles          CASCADE;

DROP TYPE IF EXISTS rol_usuario_enum      CASCADE;
DROP TYPE IF EXISTS tipo_documento_enum   CASCADE;
DROP TYPE IF EXISTS estado_pedido_enum    CASCADE;
DROP TYPE IF EXISTS tipo_comprobante_enum CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 1. TIPOS ENUMERADOS
-- ─────────────────────────────────────────────────────────────
CREATE TYPE rol_usuario_enum AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'CLIENTE'
);

CREATE TYPE tipo_documento_enum AS ENUM (
    'DNI',
    'PASAPORTE',
    'CARNET_EXTRANJERIA'
);

CREATE TYPE estado_pedido_enum AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'CANCELADO',
    'EN_CAMINO',
    'ENTREGADO'
);

CREATE TYPE tipo_comprobante_enum AS ENUM (
    'BOLETA',
    'FACTURA'
);

-- ─────────────────────────────────────────────────────────────
-- 2. TABLAS
-- ─────────────────────────────────────────────────────────────

-- 1. ROLES
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    nombre      rol_usuario_enum NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

-- 2. USUARIOS
CREATE TABLE usuarios (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id            INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email             VARCHAR(150) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    bloqueado         BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DATOS PERSONALES (3FN)
CREATE TABLE datos_personales (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_documento   tipo_documento_enum NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    nombres          VARCHAR(100) NOT NULL,
    apellidos        VARCHAR(100) NOT NULL,
    telefono         VARCHAR(20),
    direccion        TEXT,
    creado_en        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_documento_identidad UNIQUE (tipo_documento, numero_documento)
);

-- 4. CATEGORÍAS
CREATE TABLE categorias (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL UNIQUE,
    slug      VARCHAR(120) NOT NULL UNIQUE,
    activo    BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PRODUCTOS
CREATE TABLE productos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id   INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    sku            VARCHAR(50) NOT NULL UNIQUE,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    TEXT,
    precio_regular NUMERIC(10, 2) NOT NULL CHECK (precio_regular >= 0),
    precio_oferta  NUMERIC(10, 2) CHECK (precio_oferta >= 0),
    imagen_url     TEXT,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. INVENTARIO (deducción atómica)
CREATE TABLE inventario (
    producto_id    UUID NOT NULL UNIQUE REFERENCES productos(id) ON DELETE CASCADE,
    stock_actual   INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo   INTEGER NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PEDIDOS (snapshot inmutable)
CREATE TABLE pedidos (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id                  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    es_invitado                 BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_documento_comprador    tipo_documento_enum NOT NULL,
    numero_documento_comprador  VARCHAR(20) NOT NULL,
    nombres_comprador           VARCHAR(100) NOT NULL,
    apellidos_comprador         VARCHAR(100) NOT NULL,
    direccion_envio             TEXT NOT NULL,
    tipo_comprobante            tipo_comprobante_enum NOT NULL,
    ruc_factura                 VARCHAR(11),
    razon_social_factura        VARCHAR(150),
    total                       NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    estado                      estado_pedido_enum NOT NULL DEFAULT 'PENDIENTE',
    creado_en                   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. ITEMS DEL PEDIDO (precio + nombre congelados)
CREATE TABLE pedido_items (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id                 UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id               UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    nombre_historico          VARCHAR(150) NOT NULL,
    sku_historico             VARCHAR(50) NOT NULL,
    precio_unitario_historico NUMERIC(10, 2) NOT NULL CHECK (precio_unitario_historico >= 0),
    cantidad                  INTEGER NOT NULL CHECK (cantidad > 0)
);

-- ─────────────────────────────────────────────────────────────
-- 3. ÍNDICES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_productos_categoria  ON productos(categoria_id);
CREATE INDEX idx_inventario_stock     ON inventario(stock_actual);
CREATE INDEX idx_pedidos_usuario      ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado       ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha        ON pedidos(creado_en DESC);

-- ─────────────────────────────────────────────────────────────
-- 4. SEED — Roles y Super Admin inicial
-- ─────────────────────────────────────────────────────────────
INSERT INTO roles (nombre, descripcion) VALUES
    ('SUPER_ADMIN', 'Acceso total al sistema y auditoría'),
    ('ADMIN',       'Gestión operativa, catálogo, stock y pedidos'),
    ('CLIENTE',     'Comprador en la tienda digital');

-- Super Admin inicial — contraseña: Admin1234! (BCrypt costo 10)
INSERT INTO usuarios (email, password_hash, rol_id) VALUES (
    'admin@verodata.com',
    '$2b$10$w5lbf0ZKOUsHQzEWViL7re7PTbzMObqBDZY8jeW2iAlQcfzDLkPlW',
    (SELECT id FROM roles WHERE nombre = 'SUPER_ADMIN')
);

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
