/** Atributos de variante: { COLOR: 'Negro', SIZE: 'M', … } */
export type AtributosVariante = Record<string, string>;

/** Fila devuelta por GET /api/v1/products */
export interface ProductoItem {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_regular: number;
  precio_oferta: number | null;
  imagen_url: string | null;
  modelo: string | null;
  atributos: AtributosVariante;
  activo: boolean;
  stock_actual: number;
  stock_minimo: number;
  creado_en: string;
  actualizado_en: string;
}

export interface CrearProductoPayload {
  categoria_id: number;
  /** HU031: opcional si la categoría tiene plantilla (el backend lo genera). */
  sku?: string;
  nombre: string;
  descripcion: string;
  precio_regular: number;
  precio_oferta?: number;
  imagen_url?: string;
  modelo?: string;
  atributos?: AtributosVariante;
  /** HU024: existencias iniciales y umbral de la fila `inventario`. */
  stock_inicial?: number;
  stock_minimo?: number;
}

/** Contrato de POST /api/v1/products/bulk (HU028). */
export interface CrearProductosLotePayload {
  productos: CrearProductoPayload[];
}

/** Contrato de PATCH /api/v1/products/:id (HU008/HU009) — el SKU no se modifica */
export interface ActualizarProductoPayload {
  categoria_id?: number;
  nombre?: string;
  descripcion?: string;
  precio_regular?: number;
  precio_oferta?: number | null;
  imagen_url?: string;
  modelo?: string | null;
  atributos?: AtributosVariante;
  /** HU009: borrado lógico / reactivación */
  activo?: boolean;
}

/** Fila devuelta por PATCH /api/v1/inventory/:productoId */
export interface InventarioItem {
  producto_id: string;
  stock_actual: number;
  stock_minimo: number;
  actualizado_en: string;
}

/** HU033: imagen de la galería de un producto. */
export interface ProductoImagen {
  id: string;
  producto_id: string;
  url: string;
  alt: string | null;
  orden: number;
  es_principal: boolean;
  creado_en: string;
}

export interface AgregarImagenPayload {
  url?: string;
  data?: string;
  alt?: string;
  es_principal?: boolean;
}

/** Fila devuelta por GET /api/v1/inventory/alerts */
export interface AlertaStockItem {
  producto_id: string;
  sku: string;
  nombre: string;
  categoria_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  faltante: number;
}
