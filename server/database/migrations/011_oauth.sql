-- ============================================================
-- Migración 011 — acceso social (Google) vía OAuth 2.0
-- 1. Permite cuentas sin contraseña (usuarios sociales).
-- 2. Permite datos personales sin documento (se completa luego).
-- 3. Tabla de enlace con el proveedor (usuarios_oauth).
-- Ejecutar en: Supabase Dashboard > SQL Editor  (o vía pool)
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================

ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE datos_personales ALTER COLUMN tipo_documento DROP NOT NULL;
ALTER TABLE datos_personales ALTER COLUMN numero_documento DROP NOT NULL;

CREATE TABLE IF NOT EXISTS usuarios_oauth (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    proveedor        VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    creado_en        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_oauth_proveedor
    ON usuarios_oauth(proveedor, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_oauth_usuario
    ON usuarios_oauth(usuario_id);

-- Verificación
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'password_hash';

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'usuarios_oauth';
