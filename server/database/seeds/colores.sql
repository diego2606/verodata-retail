-- ============================================================
-- Seed — colores comunes (HU032). Idempotente.
-- ============================================================

INSERT INTO colores (nombre, slug, hex) VALUES
  ('Negro', 'negro', '#000000'),
  ('Blanco', 'blanco', '#FFFFFF'),
  ('Gris', 'gris', '#808080'),
  ('Gris claro', 'gris-claro', '#D3D3D3'),
  ('Plata', 'plata', '#C0C0C0'),
  ('Rojo', 'rojo', '#E53935'),
  ('Azul', 'azul', '#1E88E5'),
  ('Azul marino', 'azul-marino', '#1A237E'),
  ('Celeste', 'celeste', '#87CEEB'),
  ('Verde', 'verde', '#43A047'),
  ('Amarillo', 'amarillo', '#FDD835'),
  ('Naranja', 'naranja', '#FB8C00'),
  ('Morado', 'morado', '#8E24AA'),
  ('Púrpura', 'purpura', '#6A1B9A'),
  ('Rosa', 'rosa', '#EC407A'),
  ('Marrón', 'marron', '#6D4C41'),
  ('Marrón claro', 'marron-claro', '#A1887F'),
  ('Beige', 'beige', '#F5F5DC'),
  ('Dorado', 'dorado', '#D4AF37'),
  ('Turquesa', 'turquesa', '#26C6DA'),
  ('Violeta', 'violeta', '#9575CD'),
  ('Multicolor', 'multicolor', '#B0BEC5')
ON CONFLICT (slug) DO NOTHING;
