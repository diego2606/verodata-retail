-- ============================================================
-- Migración 021 — Atributos por dominio y valores del maestro (HU029/HU030/HU036)
--
-- Problema: un mismo atributo no aplica igual a todas las categorías.
--   · "Capacidad" de un celular = almacenamiento en GB.
--   · "Capacidad" de una refrigeradora = litros.
--   · "Capacidad" de una lavadora = kg de carga.
--   · "Contenido" de un perfume = ml.
--   · "Talla" de ropa = XS..XXL; la de calzado = 34..45.
-- Solución: atributos separados por dominio + vínculo explícito categoría↔atributo.
--
-- Idempotente.
-- ============================================================

-- 1. CAPACIDADES POR DOMINIO ---------------------------------------------
-- `CAPACITY` era genérico (sin unidad, sin valores ni uso) y `MODEL` duplicaba a
-- `productos_modelo.modelo_codigo`: dejan de ser ejes de variante.
UPDATE atributos SET activo = FALSE WHERE codigo IN ('CAPACITY', 'MODEL');

INSERT INTO atributos (codigo, nombre, tipo, es_variante, unidad, orden) VALUES
  ('TALLA_CALZADO',    'Talla de calzado',   'TEXTO',  TRUE, NULL, 8),
  ('CAPACIDAD_LITROS', 'Capacidad (litros)', 'NUMERO', TRUE, 'L',  9),
  ('CAPACIDAD_KG',     'Capacidad de carga', 'NUMERO', TRUE, 'kg', 10),
  ('CONTENIDO_ML',     'Contenido',          'NUMERO', TRUE, 'ml', 11)
ON CONFLICT (codigo) DO NOTHING;

UPDATE atributos SET nombre = 'Talla', es_variante = TRUE, activo = TRUE WHERE codigo = 'SIZE';
UPDATE atributos SET nombre = 'Almacenamiento', unidad = 'GB', activo = TRUE WHERE codigo = 'STORAGE_CAPACITY';
UPDATE atributos SET nombre = 'Género', activo = TRUE WHERE codigo = 'GENDER';
UPDATE atributos SET nombre = 'Línea', activo = TRUE WHERE codigo = 'LINE';

-- 2. VALORES DEL MAESTRO (COLOR ya tiene sus 22 desde la migración 016) ---
WITH nuevos(codigo, valor, orden) AS (VALUES
  -- Talla de ropa (letras)
  ('SIZE','XS',1), ('SIZE','S',2), ('SIZE','M',3), ('SIZE','L',4),
  ('SIZE','XL',5), ('SIZE','XXL',6), ('SIZE','XXXL',7), ('SIZE','Único',8),
  -- Talla de calzado (numeración)
  ('TALLA_CALZADO','34',1), ('TALLA_CALZADO','35',2), ('TALLA_CALZADO','36',3),
  ('TALLA_CALZADO','37',4), ('TALLA_CALZADO','38',5), ('TALLA_CALZADO','39',6),
  ('TALLA_CALZADO','40',7), ('TALLA_CALZADO','41',8), ('TALLA_CALZADO','42',9),
  ('TALLA_CALZADO','43',10), ('TALLA_CALZADO','44',11), ('TALLA_CALZADO','45',12),
  -- Almacenamiento digital (tecnología)
  ('STORAGE_CAPACITY','32 GB',1), ('STORAGE_CAPACITY','64 GB',2),
  ('STORAGE_CAPACITY','128 GB',3), ('STORAGE_CAPACITY','256 GB',4),
  ('STORAGE_CAPACITY','512 GB',5), ('STORAGE_CAPACITY','1 TB',6),
  ('STORAGE_CAPACITY','2 TB',7),
  -- Capacidad volumétrica (electrodomésticos, cocina)
  ('CAPACIDAD_LITROS','1 L',1), ('CAPACIDAD_LITROS','1.5 L',2),
  ('CAPACIDAD_LITROS','2 L',3), ('CAPACIDAD_LITROS','3 L',4),
  ('CAPACIDAD_LITROS','5 L',5), ('CAPACIDAD_LITROS','10 L',6),
  ('CAPACIDAD_LITROS','20 L',7), ('CAPACIDAD_LITROS','30 L',8),
  ('CAPACIDAD_LITROS','50 L',9), ('CAPACIDAD_LITROS','90 L',10),
  ('CAPACIDAD_LITROS','250 L',11), ('CAPACIDAD_LITROS','400 L',12),
  -- Capacidad de carga (lavadoras y secadoras)
  ('CAPACIDAD_KG','6 kg',1), ('CAPACIDAD_KG','7 kg',2), ('CAPACIDAD_KG','8 kg',3),
  ('CAPACIDAD_KG','9 kg',4), ('CAPACIDAD_KG','10 kg',5), ('CAPACIDAD_KG','11 kg',6),
  ('CAPACIDAD_KG','12 kg',7), ('CAPACIDAD_KG','14 kg',8), ('CAPACIDAD_KG','17 kg',9),
  ('CAPACIDAD_KG','20 kg',10),
  -- Contenido (belleza, higiene, farmacia)
  ('CONTENIDO_ML','30 ml',1), ('CONTENIDO_ML','50 ml',2), ('CONTENIDO_ML','100 ml',3),
  ('CONTENIDO_ML','150 ml',4), ('CONTENIDO_ML','200 ml',5), ('CONTENIDO_ML','250 ml',6),
  ('CONTENIDO_ML','400 ml',7), ('CONTENIDO_ML','500 ml',8), ('CONTENIDO_ML','1 L',9),
  -- Género
  ('GENDER','Hombre',1), ('GENDER','Mujer',2), ('GENDER','Unisex',3),
  ('GENDER','Niño',4), ('GENDER','Niña',5),
  -- Línea / estilo
  ('LINE','Casual',1), ('LINE','Urbana',2), ('LINE','Deportiva',3),
  ('LINE','Formal',4), ('LINE','Infantil',5), ('LINE','Hogar',6), ('LINE','Profesional',7)
)
INSERT INTO atributo_valores (atributo_id, valor, slug, orden)
SELECT
  a.id,
  n.valor,
  trim(both '-' from regexp_replace(
    lower(translate(n.valor, 'áéíóúüÁÉÍÓÚÜñÑ', 'aeiouuAEIOUUnn')), '[^a-z0-9]+', '-', 'g'
  )),
  n.orden
FROM nuevos n
JOIN atributos a ON a.codigo = n.codigo
ON CONFLICT ON CONSTRAINT uq_atributo_valor DO NOTHING;

-- 3. VÍNCULO CATEGORÍA ↔ ATRIBUTO ----------------------------------------
-- `categorias.atributos_permitidos` es lo que resuelve el formulario de producto
-- (herencia: gana el ancestro más cercano que lo defina). `categorias_atributos`
-- es el espejo N:M del maestro. Solo se marcan los nodos que cambian el
-- comportamiento; el resto hereda del padre.
DROP TABLE IF EXISTS _mapa_attr;
CREATE TEMP TABLE _mapa_attr (categoria_id INTEGER, codigo VARCHAR(40));

INSERT INTO _mapa_attr (categoria_id, codigo) VALUES
  -- Moda: talla de ropa (letras) + género + línea
  (224, 'COLOR'), (224, 'SIZE'), (224, 'GENDER'), (224, 'LINE'),   -- Mujer (raíz)
  (226, 'COLOR'), (226, 'SIZE'), (226, 'GENDER'), (226, 'LINE'),   -- Ropa (raíz)
  (233, 'COLOR'), (233, 'SIZE'), (233, 'GENDER'), (233, 'LINE'),   -- Hombre (raíz)
  -- Calzado: talla numérica
  (231, 'COLOR'), (231, 'TALLA_CALZADO'), (231, 'GENDER'), (231, 'LINE'),  -- Calzado (raíz)
  (234, 'COLOR'), (234, 'TALLA_CALZADO'), (234, 'GENDER'), (234, 'LINE'),  -- Calzado (bajo Hombre)
  -- Accesorios / equipaje: sin talla
  (238, 'COLOR'), (238, 'GENDER'),                                 -- Accesorios (raíz)
  (239, 'COLOR'), (239, 'GENDER'),                                 -- Equipaje, Bolsos y Carteras
  (237, 'COLOR'), (237, 'GENDER'),                                 -- Equipaje (bajo Hombre)
  -- Tecnología: almacenamiento digital
  (245, 'COLOR'), (245, 'STORAGE_CAPACITY'), (245, 'LINE'),        -- Tecnología (raíz)
  (246, 'COLOR'), (246, 'STORAGE_CAPACITY'), (246, 'LINE'),        -- Celulares y Smartphones
  (247, 'COLOR'), (247, 'STORAGE_CAPACITY'), (247, 'LINE'),        -- Computación
  (248, 'COLOR'), (248, 'LINE'),                                   -- Electrónica, Audio y Video
  (249, 'COLOR'), (249, 'STORAGE_CAPACITY'), (249, 'LINE'),        -- Consolas y Videojuegos
  -- Hogar: capacidad por dominio
  (250, 'COLOR'),                                                  -- Hogar (raíz)
  (260, 'COLOR'), (260, 'CAPACIDAD_LITROS'), (260, 'CAPACIDAD_KG'),-- Electrodomésticos
  (253, 'COLOR'), (253, 'CAPACIDAD_LITROS'),                       -- Cocina y Bazar
  -- Deportes: talla y género
  (261, 'COLOR'), (261, 'SIZE'), (261, 'GENDER'),                  -- Deportes y Fitness (raíz)
  -- Belleza: contenido en ml
  (271, 'COLOR'), (271, 'CONTENIDO_ML'),                           -- Belleza y Cuidado Personal (raíz)
  -- Juegos y juguetes
  (281, 'COLOR'), (281, 'SIZE')                                    -- Juegos y Juguetes (raíz)
;

UPDATE categorias c
   SET atributos_permitidos = sub.atributos
  FROM (
    SELECT m.categoria_id, array_agg(a.codigo ORDER BY a.orden) AS atributos
      FROM _mapa_attr m
      JOIN atributos a ON a.codigo = m.codigo
     GROUP BY m.categoria_id
  ) sub
 WHERE c.id = sub.categoria_id;

INSERT INTO categorias_atributos (categoria_id, atributo_id, obligatorio, orden)
SELECT m.categoria_id, a.id, FALSE,
       row_number() OVER (PARTITION BY m.categoria_id ORDER BY a.orden)
  FROM (SELECT DISTINCT categoria_id, codigo FROM _mapa_attr) m
  JOIN atributos a ON a.codigo = m.codigo
ON CONFLICT (categoria_id, atributo_id) DO NOTHING;

DROP TABLE IF EXISTS _mapa_attr;

SELECT
  (SELECT COUNT(*) FROM atributos WHERE activo = TRUE) AS atributos_activos,
  (SELECT COUNT(*) FROM atributo_valores) AS valores,
  (SELECT COUNT(*) FROM categorias_atributos) AS vinculos,
  (SELECT COUNT(*) FROM categorias WHERE atributos_permitidos IS NOT NULL) AS categorias_con_atributos;
