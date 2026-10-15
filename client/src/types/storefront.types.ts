/** Tipos del catálogo público (HU013) — espejo del backend `modules/storefront`. */

export interface ProductoPublico {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  categoria_slug: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_regular: number;
  precio_oferta: number | null;
  descuento_pct: number;
  imagen_url: string | null;
  modelo: string | null;
  atributos: Record<string, string>;
  disponible: boolean;
  stock_total: number;
  variantes: number;
}

export interface CategoriaPublicaNodo {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  categoria_padre_id: number | null;
  hijos: CategoriaPublicaNodo[];
}

export interface CatalogoPaginado {
  items: ProductoPublico[];
  pagina: number;
  total_paginas: number;
  total: number;
}

export interface DetalleProducto {
  producto: ProductoPublico;
  variantes: ProductoPublico[];
}

/** Filtros del catálogo público. */
export interface FiltrosCatalogo {
  search?: string;
  categoria_id?: number;
  precio_min?: number;
  precio_max?: number;
  pagina?: number;
  limite?: number;
}
