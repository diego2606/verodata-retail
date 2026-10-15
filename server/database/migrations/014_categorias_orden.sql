-- ============================================================
-- Migración 014 — orden manual de categorías (backoffice)
-- Permite reordenar categorías dentro del mismo padre.
-- Idempotente.
-- ============================================================

ALTER TABLE categorias ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_categorias_orden ON categorias(categoria_padre_id, orden);

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categorias' AND column_name = 'orden';
