/**
 * Claves de atributo de variante admitidas en `productos.atributos`.
 * Fuente única compartida entre productos y categorías (HU029/HU031).
 */
export const ATRIBUTOS_VARIANTE_KEYS = [
  'COLOR',
  'SIZE',
  'CAPACITY',
  'STORAGE_CAPACITY',
  'MODEL',
  'GENDER',
  'LINE',
  'BRAND',
] as const;

export type AtributoVarianteKey = (typeof ATRIBUTOS_VARIANTE_KEYS)[number];

/** Etiquetas legibles para la UI / documentación. */
export const ATRIBUTO_LABELS: Record<AtributoVarianteKey, string> = {
  COLOR: 'Color',
  SIZE: 'Talla',
  CAPACITY: 'Capacidad',
  STORAGE_CAPACITY: 'Almacenamiento',
  MODEL: 'Modelo (código)',
  GENDER: 'Género',
  LINE: 'Línea',
  BRAND: 'Marca',
};

/**
 * Tokens que pueden formar un SKU estructurado (HU031). `CATEGORIA` usa el
 * prefijo de la categoría; el resto son claves de atributo.
 */
export const SKU_SEGMENTOS = [
  'CATEGORIA',
  'BRAND',
  'MODEL',
  'COLOR',
  'SIZE',
  'CAPACITY',
  'STORAGE_CAPACITY',
  'GENDER',
  'LINE',
] as const;

export type SkuSegmento = (typeof SKU_SEGMENTOS)[number];
