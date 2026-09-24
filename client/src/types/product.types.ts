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
  activo: boolean;
  stock_actual: number;
  creado_en: string;
  actualizado_en: string;
}

export interface CrearProductoPayload {
  categoria_id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precio_regular: number;
  precio_oferta?: number;
  imagen_url?: string;
}
