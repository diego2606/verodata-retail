-- ============================================================
-- Migración 010 — cuentas de cliente: reseteo de contraseña y direcciones
-- Crea: `password_resets` y `direcciones`.
-- Ejecutar en: Supabase Dashboard > SQL Editor  (o vía pool)
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

-- 1. Tokens de restablecimiento de contraseña (se guarda solo el hash)
CREATE TABLE IF NOT EXISTS password_resets (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expira_en  TIMESTAMP WITH TIME ZONE NOT NULL,
    usado_en   TIMESTAMP WITH TIME ZONE,
    creado_en  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_usuario ON password_resets(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_hash ON password_resets(token_hash);

-- 2. Libreta de direcciones desacoplada en 3FN (HU017)
-- Una sola dirección principal por usuario (índice único parcial).
CREATE TABLE IF NOT EXISTS direcciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    departamento    VARCHAR(100) NOT NULL,
    provincia       VARCHAR(100) NOT NULL,
    distrito        VARCHAR(100) NOT NULL,
    direccion_linea TEXT NOT NULL,
    referencia      TEXT,
    codigo_postal   VARCHAR(20),
    es_principal    BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones(usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_direccion_principal
    ON direcciones(usuario_id) WHERE es_principal;

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('password_resets', 'direcciones')
ORDER BY table_name, ordinal_position;
