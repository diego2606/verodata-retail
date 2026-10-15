-- ============================================================
-- Migración 020 — Eliminación de la tabla legacy `colores` (HU032 → HU036)
-- Los colores son ahora valores del atributo COLOR del maestro
-- (`atributo_valores`), migrados en la 016. La tabla `colores` quedó sin uso:
-- el storefront ya lee los swatches del maestro.
-- Idempotente.
-- ============================================================

-- Red de seguridad: si algún color del maestro no existiera, se asegura antes de borrar.
INSERT INTO atributo_valores (atributo_id, valor, slug, hex, activo)
SELECT a.id, c.nombre, c.slug, c.hex, c.activo
FROM colores c
JOIN atributos a ON a.codigo = 'COLOR'
ON CONFLICT ON CONSTRAINT uq_atributo_valor DO NOTHING;

DROP TABLE IF EXISTS colores;

SELECT (SELECT COUNT(*) FROM atributo_valores v
        JOIN atributos a ON a.id = v.atributo_id
        WHERE a.codigo = 'COLOR') AS valores_color;
