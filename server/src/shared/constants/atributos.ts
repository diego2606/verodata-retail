/**
 * Claves de atributo de variante admitidas en `productos.atributos`.
 * Fuente única compartida entre productos y categorías (HU029/HU031/HU036).
 *
 * Los códigos curados del maestro (migración 021) van primero; los legados se
 * conservan al final para no romper los datos importados de ML ni las plantillas
 * antiguas, aunque ya no sean ejes activos del maestro.
 */
export const ATRIBUTOS_VARIANTE_KEYS = [
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
  // Legados (solo lectura/compatibilidad)
  'CAPACITY',
  'MODEL',
] as const;

export type AtributoVarianteKey = (typeof ATRIBUTOS_VARIANTE_KEYS)[number];

/** Etiquetas legibles para la UI / documentación. */
export const ATRIBUTO_LABELS: Record<AtributoVarianteKey, string> = {
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
  'TALLA_CALZADO',
  'STORAGE_CAPACITY',
  'CAPACIDAD_LITROS',
  'CAPACIDAD_KG',
  'CONTENIDO_ML',
  'GENDER',
  'LINE',
  'CAPACITY',
] as const;

export type SkuSegmento = (typeof SKU_SEGMENTOS)[number];

/**
 * Tokens cuyo valor es numérico (con o sin unidad): el SKU usa solo los dígitos.
 * Ej.: "256 GB" → `256`, "250 L" → `250`, "10 kg" → `10`, "100 ml" → `100`.
 */
export const SKU_TOKENS_NUMERICOS: ReadonlySet<string> = new Set([
  'STORAGE_CAPACITY',
  'CAPACIDAD_LITROS',
  'CAPACIDAD_KG',
  'CONTENIDO_ML',
  'CAPACITY',
]);
