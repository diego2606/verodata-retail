/** Claves y etiquetas de atributos de variante (espejo del backend, HU029/HU031). */
export const ATRIBUTO_KEYS = [
  'COLOR',
  'SIZE',
  'CAPACITY',
  'STORAGE_CAPACITY',
  'MODEL',
  'GENDER',
  'LINE',
  'BRAND',
] as const;

export type AtributoKey = (typeof ATRIBUTO_KEYS)[number];

export const ATRIBUTO_LABELS: Record<string, string> = {
  COLOR: 'Color',
  SIZE: 'Talla',
  CAPACITY: 'Capacidad',
  STORAGE_CAPACITY: 'Almacenamiento',
  MODEL: 'Modelo (código)',
  GENDER: 'Género',
  LINE: 'Línea',
  BRAND: 'Marca',
};

/** Tokens válidos de una plantilla de SKU estructurado (HU031). */
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

export const SKU_SEGMENTO_LABELS: Record<string, string> = {
  CATEGORIA: 'Categoría (prefijo)',
  ...ATRIBUTO_LABELS,
};
