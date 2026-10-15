-- ============================================================
-- Migración 022 — Almacenamiento sin ambigüedad de SKU
-- El código de SKU de un token de capacidad usa **solo los dígitos** (HU031), así
-- que "1 TB" y "1 GB" producirían el mismo segmento. Se expresan en GB.
-- Idempotente.
-- ============================================================

UPDATE atributo_valores v
   SET valor = '1024 GB', slug = '1024-gb'
  FROM atributos a
 WHERE a.id = v.atributo_id
   AND a.codigo = 'STORAGE_CAPACITY'
   AND v.valor = '1 TB';

UPDATE atributo_valores v
   SET valor = '2048 GB', slug = '2048-gb'
  FROM atributos a
 WHERE a.id = v.atributo_id
   AND a.codigo = 'STORAGE_CAPACITY'
   AND v.valor = '2 TB';

SELECT v.valor FROM atributo_valores v
  JOIN atributos a ON a.id = v.atributo_id
 WHERE a.codigo = 'STORAGE_CAPACITY'
 ORDER BY v.orden;
