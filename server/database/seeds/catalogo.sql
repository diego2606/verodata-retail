-- ============================================================
-- Seed de catálogo de ejemplo (marcas/modelos reales, datos ficticios)
-- Precios en PEN. Imágenes placeholder (picsum) sin copyright.
-- Idempotente: puede ejecutarse varias veces.
-- ============================================================

-- Categorías
INSERT INTO categorias (nombre, slug, descripcion) VALUES
  ('Calzado',      'calzado',      'Zapatillas y calzado deportivo'),
  ('Indumentaria', 'indumentaria', 'Ropa y prendas deportivas'),
  ('Accesorios',   'accesorios',   'Complementos y accesorios'),
  ('Smartphones',  'smartphones',  'Teléfonos inteligentes'),
  ('Laptops',      'laptops',      'Computadoras portátiles'),
  ('Televisores',  'televisores',  'Televisores y smart TV'),
  ('Audio',        'audio',        'Audífonos y parlantes'),
  ('Monitores',    'monitores',    'Monitores y pantallas')
ON CONFLICT (nombre) DO NOTHING;

-- Productos
INSERT INTO productos (categoria_id, sku, nombre, descripcion, precio_regular, precio_oferta, imagen_url)
SELECT c.id, v.sku, v.nombre, v.descripcion, v.precio_regular, v.precio_oferta, v.imagen_url
FROM (VALUES
  ('Calzado', 'NIK-AF1-001',  'Nike Air Force 1',        'Zapatilla clásica de cuero, estilo urbano.',              449.90,  379.90,  'https://picsum.photos/seed/NIK-AF1-001/600/600'),
  ('Calzado', 'NIK-AM270-002','Nike Air Max 270',        'Amortiguación Air visible para uso diario.',              549.90,  NULL,    'https://picsum.photos/seed/NIK-AM270-002/600/600'),
  ('Calzado', 'ADI-UB22-003', 'Adidas Ultraboost 22',    'Running con retorno de energía Boost.',                   699.90,  599.90,  'https://picsum.photos/seed/ADI-UB22-003/600/600'),
  ('Calzado', 'ADI-STAN-004', 'Adidas Stan Smith',       'Clásico de tenis en cuero blanco.',                       349.90,  NULL,    'https://picsum.photos/seed/ADI-STAN-004/600/600'),
  ('Calzado', 'PUM-RSX-005',  'Puma RS-X',               'Diseño chunky retro con suela gruesa.',                   399.90,  329.90,  'https://picsum.photos/seed/PUM-RSX-005/600/600'),
  ('Calzado', 'PUM-SUEDE-006','Puma Suede Classic',      'Silueta icónica en gamuza.',                              299.90,  NULL,    'https://picsum.photos/seed/PUM-SUEDE-006/600/600'),
  ('Calzado', 'NB-574-007',   'New Balance 574',         'Zapatilla lifestyle de perfil bajo.',                     379.90,  NULL,    'https://picsum.photos/seed/NB-574-007/600/600'),

  ('Indumentaria', 'NIK-DRI-010', 'Nike Dri-FIT',        'Polo deportivo de secado rápido.',                        149.90,  NULL,    'https://picsum.photos/seed/NIK-DRI-010/600/600'),
  ('Indumentaria', 'ADI-TIRO-011','Adidas Tiro 23',      'Short de entrenamiento con tecnología AEROREADY.',        179.90,  149.90,  'https://picsum.photos/seed/ADI-TIRO-011/600/600'),
  ('Indumentaria', 'PUM-ESS-012', 'Puma Essentials',     'Hoodie con capucha de algodón.',                          199.90,  NULL,    'https://picsum.photos/seed/PUM-ESS-012/600/600'),
  ('Indumentaria', 'CHA-HOOD-013','Champion Hoodie',     'Sudadera clásica unisex.',                                189.90,  159.90,  'https://picsum.photos/seed/CHA-HOOD-013/600/600'),

  ('Accesorios', 'NIK-BP-020',    'Nike Heritage Backpack','Mochila con compartimento para laptop.',                199.90,  169.90,  'https://picsum.photos/seed/NIK-BP-020/600/600'),
  ('Accesorios', 'ADI-CAP-021',   'Adidas Cap',           'Gorra ajustable con logo bordado.',                        89.90,  NULL,    'https://picsum.photos/seed/ADI-CAP-021/600/600'),
  ('Accesorios', 'CAS-GSHOCK-022','Casio G-Shock',        'Reloj resistente al agua y a impactos.',                  599.90,  NULL,    'https://picsum.photos/seed/CAS-GSHOCK-022/600/600'),

  ('Smartphones', 'APL-IP15P-030','iPhone 15 Pro 128GB',  'Pantalla Super Retina XDR y chip A17 Pro.',              4999.00, 4699.00,  'https://picsum.photos/seed/APL-IP15P-030/600/600'),
  ('Smartphones', 'APL-IP14-031', 'iPhone 14 128GB',      'Cámara dual y chip A15 Bionic.',                         3799.00, NULL,    'https://picsum.photos/seed/APL-IP14-031/600/600'),
  ('Smartphones', 'SAM-S24U-032', 'Samsung Galaxy S24 Ultra','Cámara 200MP y S Pen integrado.',                     5299.00, 4899.00,  'https://picsum.photos/seed/SAM-S24U-032/600/600'),
  ('Smartphones', 'SAM-A55-033',  'Samsung Galaxy A55',   'Pantalla AMOLED y batería de larga duración.',           1599.00, NULL,    'https://picsum.photos/seed/SAM-A55-033/600/600'),
  ('Smartphones', 'XIA-RN13-034', 'Xiaomi Redmi Note 13', 'Cámara 108MP y carga rápida.',                             899.00,  799.00,  'https://picsum.photos/seed/XIA-RN13-034/600/600'),

  ('Laptops', 'APL-MBA-M3-040', 'MacBook Air M3 13"',    'Chip M3, 8GB RAM y 256GB SSD.',                          5999.00, 5699.00,  'https://picsum.photos/seed/APL-MBA-M3-040/600/600'),
  ('Laptops', 'APL-MBP14-041',  'MacBook Pro 14" M3',    'Pantalla Liquid Retina XDR y 16GB RAM.',                 8999.00, NULL,    'https://picsum.photos/seed/APL-MBP14-041/600/600'),
  ('Laptops', 'HP-PAV15-042',   'HP Pavilion 15',        'Intel Core i5, 16GB RAM y 512GB SSD.',                   2799.00, 2499.00,  'https://picsum.photos/seed/HP-PAV15-042/600/600'),
  ('Laptops', 'ASUS-ROG16-043', 'Asus ROG Strix G16',    'Gaming con RTX 4060 y pantalla 165Hz.',                  6499.00, NULL,    'https://picsum.photos/seed/ASUS-ROG16-043/600/600'),
  ('Laptops', 'LEN-IP3-044',    'Lenovo IdeaPad 3',      'Ryzen 5, 8GB RAM y 256GB SSD.',                          1899.00, NULL,    'https://picsum.photos/seed/LEN-IP3-044/600/600'),
  ('Laptops', 'DELL-XPS13-045', 'Dell XPS 13',           'Ultrabook premium con Intel Core i7.',                   5499.00, NULL,    'https://picsum.photos/seed/DELL-XPS13-045/600/600'),

  ('Televisores', 'LG-OLEDC3-050','LG OLED C3 55"',      'OLED 4K con procesador a9 Gen6.',                        3999.00, 3499.00,  'https://picsum.photos/seed/LG-OLEDC3-050/600/600'),
  ('Televisores', 'SAM-Q60C-051', 'Samsung QLED Q60C 50"','4K UHD con Quantum HDR.',                               2299.00, NULL,    'https://picsum.photos/seed/SAM-Q60C-051/600/600'),
  ('Televisores', 'SNY-X75K-052', 'Sony Bravia X75K 43"', '4K HDR con Google TV.',                                  1699.00, 1499.00,  'https://picsum.photos/seed/SNY-X75K-052/600/600'),
  ('Televisores', 'XIA-TVP1-053', 'Xiaomi TV P1 43"',     'Smart TV 4K con Android TV.',                            1099.00, NULL,    'https://picsum.photos/seed/XIA-TVP1-053/600/600'),

  ('Audio', 'SNY-XM5-060',  'Sony WH-1000XM5',        'Audífonos con cancelación de ruido.',                    1499.00, 1299.00,  'https://picsum.photos/seed/SNY-XM5-060/600/600'),
  ('Audio', 'APL-AIRP2-061','AirPods Pro 2',          'Cancelación activa de ruido y audio espacial.',          1099.00, NULL,    'https://picsum.photos/seed/APL-AIRP2-061/600/600'),
  ('Audio', 'JBL-FLIP6-062', 'JBL Flip 6',            'Parlante portátil resistente al agua.',                    449.90,  399.90,  'https://picsum.photos/seed/JBL-FLIP6-062/600/600'),
  ('Audio', 'LOG-GPX-063',   'Logitech G Pro X',      'Audífonos gamer con micrófono Blue VO!CE.',                549.90, NULL,    'https://picsum.photos/seed/LOG-GPX-063/600/600'),

  ('Monitores', 'LG-UG27-070', 'LG UltraGear 27"',     'Monitor gaming 165Hz QHD.',                              1299.00, 1099.00,  'https://picsum.photos/seed/LG-UG27-070/600/600'),
  ('Monitores', 'SAM-G5-071',  'Samsung Odyssey G5 27"','Curvo QHD 144Hz.',                                       1199.00, NULL,    'https://picsum.photos/seed/SAM-G5-071/600/600'),
  ('Monitores', 'ASUS-VG27-072','Asus TUF VG27',       '170Hz IPS con Adaptive-Sync.',                           1099.00, NULL,    'https://picsum.photos/seed/ASUS-VG27-072/600/600')
) AS v(categoria, sku, nombre, descripcion, precio_regular, precio_oferta, imagen_url)
JOIN categorias c ON c.nombre = v.categoria
ON CONFLICT (sku) DO NOTHING;

-- Inventario inicial (stock pseudoaleatorio estable; algunos quedan en/bajo el mínimo)
INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
SELECT id, (ABS(hashtext(sku)) % 38) + 2, 5 FROM productos
ON CONFLICT (producto_id) DO NOTHING;

-- Resumen
SELECT
  (SELECT COUNT(*) FROM categorias) AS categorias,
  (SELECT COUNT(*) FROM productos)  AS productos,
  (SELECT COUNT(*) FROM inventario) AS inventario;
