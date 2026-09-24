/** Fila devuelta por GET /api/v1/categories */
export interface CategoriaItem {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  categoria_padre_id: number | null;
  /** HU029: atributos propios; null = heredar del ancestro más cercano. */
  atributos_permitidos: string[] | null;
  /** HU030: valores sugeridos propios por atributo; null = heredar. */
  atributos_valores: Record<string, string[]> | null;
  /** HU031: prefijo de categoría para el SKU estructurado (ej. TEC). */
  sku_prefijo: string | null;
  /** HU031: orden de segmentos de la plantilla de SKU. */
  sku_segmentos: string[] | null;
  activo: boolean;
  creado_en: string;
  productos_count: number;
  hijos_count: number;
  /** Atributos efectivos (propios o heredados) para el formulario de productos. */
  atributos_sugeridos: string[];
  /** Valores sugeridos efectivos por atributo (propios o heredados). */
  valores_sugeridos: Record<string, string[]>;
}

export interface CrearCategoriaPayload {
  nombre: string;
  slug?: string;
  descripcion?: string;
  categoria_padre_id?: number | null;
  /** HU029: null/omitido = heredar. */
  atributos_permitidos?: string[] | null;
  /** HU030: null/omitido = heredar. */
  atributos_valores?: Record<string, string[]> | null;
  /** HU031 */
  sku_prefijo?: string | null;
  sku_segmentos?: string[] | null;
}

export interface ActualizarCategoriaPayload {
  nombre?: string;
  slug?: string;
  descripcion?: string;
  activo?: boolean;
  categoria_padre_id?: number | null;
  /** HU029: null = volver a heredar. */
  atributos_permitidos?: string[] | null;
  /** HU030: null = volver a heredar. */
  atributos_valores?: Record<string, string[]> | null;
  /** HU031 */
  sku_prefijo?: string | null;
  sku_segmentos?: string[] | null;
}
