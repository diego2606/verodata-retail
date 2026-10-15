-- ============================================================
-- Migración 016 — Maestro de Atributos y Valores
-- Crea: `atributos`, `atributo_valores`, `categorias_atributos`.
-- Siembra los atributos estándar y migra la tabla `colores` a valores de COLOR.
-- Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS atributos (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(40) NOT NULL UNIQUE,
    nombre      VARCHAR(60) NOT NULL,
    tipo        VARCHAR(12) NOT NULL DEFAULT 'TEXTO'
                CHECK (tipo IN ('TEXTO','COLOR','NUMERO','BOOLEANO')),
    es_variante BOOLEAN NOT NULL DEFAULT TRUE,
    unidad      VARCHAR(12),
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    orden       INTEGER NOT NULL DEFAULT 0,
    creado_en   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atributo_valores (
    id          SERIAL PRIMARY KEY,
    atributo_id INTEGER NOT NULL REFERENCES atributos(id) ON DELETE CASCADE,
    valor       VARCHAR(60) NOT NULL,
    slug        VARCHAR(80) NOT NULL,
    hex         VARCHAR(7),
    meta        JSONB,
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    orden       INTEGER NOT NULL DEFAULT 0,
    creado_en   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_atributo_valor UNIQUE (atributo_id, slug)
);

CREATE TABLE IF NOT EXISTS categorias_atributos (
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    atributo_id  INTEGER NOT NULL REFERENCES atributos(id) ON DELETE RESTRICT,
    obligatorio  BOOLEAN NOT NULL DEFAULT FALSE,
    orden        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (categoria_id, atributo_id)
);

-- Atributos estándar (códigos usados por el catálogo)
INSERT INTO atributos (codigo, nombre, tipo, es_variante, unidad, orden) VALUES
  ('COLOR',            'Color',         'COLOR',  TRUE, NULL, 1),
  ('SIZE',             'Talla',         'TEXTO',  TRUE, NULL, 2),
  ('CAPACITY',         'Capacidad',     'TEXTO',  TRUE, NULL, 3),
  ('STORAGE_CAPACITY', 'Almacenamiento','NUMERO', TRUE, 'GB', 4),
  ('MODEL',            'Modelo',        'TEXTO',  TRUE, NULL, 5),
  ('GENDER',           'Género',        'TEXTO',  TRUE, NULL, 6),
  ('LINE',             'Línea',         'TEXTO',  TRUE, NULL, 7)
ON CONFLICT (codigo) DO NOTHING;

-- Migrar la tabla `colores` → valores del atributo COLOR
INSERT INTO atributo_valores (atributo_id, valor, slug, hex, activo)
SELECT a.id, c.nombre, c.slug, c.hex, c.activo
FROM colores c
JOIN atributos a ON a.codigo = 'COLOR'
ON CONFLICT ON CONSTRAINT uq_atributo_valor DO NOTHING;

SELECT (SELECT COUNT(*) FROM atributos) AS atributos,
       (SELECT COUNT(*) FROM atributo_valores) AS valores;
