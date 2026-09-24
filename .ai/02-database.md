# 02. ESQUEMA DE BASE DE DATOS Y PERSISTENCIA (POSTGRESQL / SUPABASE)
**Motor:** PostgreSQL 15+ (Supabase)  
**Diseño:** Tercera Forma Normal (3FN) con Desnormalización Controlada (Snapshot en Pedidos).  
**Nota:** Este documento refleja el schema físico real existente en la instancia de Supabase del proyecto.

---

## 1. TIPOS ENUMERADOS (ENUMS)

```sql
-- Roles de usuario del sistema
CREATE TYPE rol_usuario_enum AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'CLIENTE'
);

-- Tipos de documentos de identidad reconocidos
CREATE TYPE tipo_documento_enum AS ENUM (
    'DNI',
    'PASAPORTE',
    'CARNET_EXTRANJERIA'
);

-- Estados formales del flujo de un pedido
CREATE TYPE estado_pedido_enum AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'CANCELADO',
    'EN_CAMINO',
    'ENTREGADO'
);

-- Tipos de comprobante de pago
CREATE TYPE tipo_comprobante_enum AS ENUM (
    'BOLETA',
    'FACTURA'
);
```

---

## 2. DEFINICIÓN FÍSICA DE TABLAS (DDL)

```sql
-- 1. TABLA DE ROLES
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    nombre      rol_usuario_enum NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

-- 2. TABLA DE USUARIOS (CREDENCIALES Y ACCESO)
-- PK: UUID generado automáticamente con gen_random_uuid()
-- bloqueado=TRUE significa que la cuenta está suspendida (inverso de "activo")
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

-- 3. TABLA DE DATOS PERSONALES (DESACOPLADA EN 3FN)
-- FK: usuario_id (UUID) → usuarios.id
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

-- 4. TABLA DE CATEGORÍAS
-- No tiene columna descripcion ni updated_at
CREATE TABLE categorias (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL UNIQUE,
    slug      VARCHAR(120) NOT NULL UNIQUE,
    activo    BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE PRODUCTOS
-- precio_regular en lugar de precio; categoria_id en lugar de id_categoria
-- Incluye imagen_url; no tiene slug ni columna CHECK explícita en precio
CREATE TABLE productos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id   INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    sku            VARCHAR(50) NOT NULL UNIQUE,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    TEXT,
    precio_regular NUMERIC(10, 2) NOT NULL,
    precio_oferta  NUMERIC(10, 2),
    imagen_url     TEXT,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE INVENTARIO (CONTROL ATÓMICO)
-- PK compuesta implícita: producto_id es la clave única
-- No tiene columna id propia ni stock_alerta
CREATE TABLE inventario (
    producto_id    UUID NOT NULL UNIQUE REFERENCES productos(id) ON DELETE CASCADE,
    stock_actual   INTEGER NOT NULL DEFAULT 0,
    stock_minimo   INTEGER NOT NULL DEFAULT 5,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE PEDIDOS (INMUTABILIDAD MEDIANTE SNAPSHOT HISTÓRICO)
-- usuario_id nullable para Guest Checkout (es_invitado=TRUE)
-- Snapshot del comprador en columnas *_comprador
-- Soporta tipo_comprobante (BOLETA / FACTURA) con campos de facturación opcionales
-- Nota: no tiene columnas de snapshot de dirección por campos separados (departamento/provincia/distrito),
--        usa un único campo direccion_envio TEXT
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
    total                       NUMERIC(10, 2) NOT NULL,
    estado                      estado_pedido_enum NOT NULL DEFAULT 'PENDIENTE',
    creado_en                   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE ITEMS DEL PEDIDO (PRECIO CONGELADO — SNAPSHOT)
-- Nombre real en BD: pedido_items (no detalles_pedido)
-- Incluye nombre_historico y sku_historico como parte del snapshot
CREATE TABLE pedido_items (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id                 UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id               UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    nombre_historico          VARCHAR(150) NOT NULL,
    sku_historico             VARCHAR(50) NOT NULL,
    precio_unitario_historico NUMERIC(10, 2) NOT NULL,
    cantidad                  INTEGER NOT NULL CHECK (cantidad > 0)
);
```

---

## 3. FOREIGN KEYS DEL SISTEMA

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `usuarios` | `rol_id` | `roles` | `id` |
| `datos_personales` | `usuario_id` | `usuarios` | `id` |
| `productos` | `categoria_id` | `categorias` | `id` |
| `inventario` | `producto_id` | `productos` | `id` |
| `pedidos` | `usuario_id` | `usuarios` | `id` |
| `pedido_items` | `pedido_id` | `pedidos` | `id` |
| `pedido_items` | `producto_id` | `productos` | `id` |

---

## 4. ÍNDICES DE RENDIMIENTO (LATENCIA < 800 ms)

```sql
CREATE UNIQUE INDEX ON usuarios(email);
CREATE UNIQUE INDEX ON datos_personales(tipo_documento, numero_documento);
CREATE UNIQUE INDEX ON productos(sku);
CREATE INDEX ON productos(categoria_id);
CREATE INDEX ON inventario(stock_actual);
CREATE INDEX ON pedidos(usuario_id);
CREATE INDEX ON pedidos(estado);
CREATE INDEX ON pedidos(creado_en DESC);
```

---

## 5. SEED — DATOS INICIALES

```sql
-- Roles del sistema
INSERT INTO roles (nombre, descripcion) VALUES
    ('SUPER_ADMIN', 'Acceso total al sistema y auditoría'),
    ('ADMIN',       'Gestión operativa, catálogo, stock y pedidos'),
    ('CLIENTE',     'Comprador en la tienda digital');
```

---

## 6. NOTAS DE DIFERENCIAS CON EL DISEÑO ORIGINAL

> Estas diferencias deben tenerse en cuenta en TODOS los módulos futuros.

| Diseño original | Schema real en BD | Impacto |
|---|---|---|
| `id BIGSERIAL` | `id UUID` (gen_random_uuid) | Usar `string` en TypeScript para IDs |
| `id_rol` | `rol_id` | FK de usuarios a roles |
| `activo BOOLEAN` | `bloqueado BOOLEAN` (lógica inversa) | `bloqueado=FALSE` = cuenta activa |
| `bloqueado_hasta TIMESTAMP` | **No existe** | Bloqueo temporal no implementado |
| `created_at` | `creado_en` | Nombres de columnas en español |
| `updated_at` | `actualizado_en` | Nombres de columnas en español |
| `id_usuario` (FK) | `usuario_id` | FK en datos_personales |
| `id_categoria` | `categoria_id` | FK en productos |
| `id_producto` | `producto_id` | FK en inventario y pedido_items |
| `precio` | `precio_regular` | Columna de precio base en productos |
| `detalles_pedido` | `pedido_items` | Nombre real de la tabla de items |
| `slug` en productos | **No existe** | Sin slug en productos |
| `descripcion` en categorias | **No existe** | Categorías sin descripción |
| `stock_alerta BOOLEAN` | **No existe** | Sin bandera de alerta en inventario |
| snapshot con 6 campos dirección | `direccion_envio TEXT` | Dirección como campo único |
| `metodo_pago_enum` | **No existe** | Sin método de pago en pedidos |
| `subtotal`, `costo_envio` en pedidos | **No existen** | Solo `total` en pedidos |
| `pedido_items` sin snapshot texto | `nombre_historico`, `sku_historico` | Mayor riqueza de snapshot |
| — | `tipo_comprobante_enum` (BOLETA/FACTURA) | Campo extra de comprobante |
| — | `imagen_url` en productos | Campo extra para imagen |