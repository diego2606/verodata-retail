/** Claves y etiquetas de atributos de variante (espejo del backend, HU029/HU031/HU036). */
export const ATRIBUTO_KEYS = [
  'COLOR',
  'SIZE',
  'TALLA_CALZADO',
  'STORAGE_CAPACITY',
  'CAPACIDAD_LITROS',
  'CAPACIDAD_KG',
  'CONTENIDO_ML',
  'GENDER',
  'LINE',
  'BRAND',
  // Legados (importación ML): solo lectura/compatibilidad.
  'CAPACITY',
  'MODEL',
] as const;

export type AtributoKey = (typeof ATRIBUTO_KEYS)[number];

export const ATRIBUTO_LABELS: Record<string, string> = {
  COLOR: 'Color',
  SIZE: 'Talla',
  TALLA_CALZADO: 'Talla de calzado',
  STORAGE_CAPACITY: 'Almacenamiento',
  CAPACIDAD_LITROS: 'Capacidad (litros)',
  CAPACIDAD_KG: 'Capacidad de carga',
  CONTENIDO_ML: 'Contenido',
  GENDER: 'Género',
  LINE: 'Línea',
  BRAND: 'Marca',
  CAPACITY: 'Capacidad (legado)',
  MODEL: 'Modelo (legado)',
};

/** Tokens válidos de una plantilla de SKU estructurado (HU031). */
export const SKU_SEGMENTOS = [
  'CATEGORIA',
  'BRAND',
  'MODEL',
  'COLOR',
  'SIZE',
  'TALLA_CALZADO',
  'STORAGE_CAPACITY',
  'CAPACIDAD_LITROS',
  'CAPACIDAD_KG',
  'CONTENIDO_ML',
  'GENDER',
  'LINE',
  'CAPACITY',
] as const;

export const SKU_SEGMENTO_LABELS: Record<string, string> = {
  CATEGORIA: 'Categoría (prefijo)',
  ...ATRIBUTO_LABELS,
};

/**
 * Tokens numéricos (con o sin unidad): el SKU usa solo los dígitos.
 * Ej.: "256 GB" → `256`, "250 L" → `250`.
 */
export const SKU_TOKENS_NUMERICOS: ReadonlySet<string> = new Set([
  'STORAGE_CAPACITY',
  'CAPACIDAD_LITROS',
  'CAPACIDAD_KG',
  'CONTENIDO_ML',
  'CAPACITY',
]);
