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

/** HU034: banner vigente que consume la portada. */
export interface BannerPublico {
  id: string;
  ubicacion: 'HERO' | 'TICKER' | 'BANDA_EDITORIAL';
  titulo: string;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  imagen_url: string;
  orden: number;
}

/** HU034: contenido completo que devuelve GET /storefront/home. */
export interface HomeData {
  banners: {
    hero: BannerPublico[];
    ticker: BannerPublico[];
    banda: BannerPublico[];
  };
  config: Record<string, unknown>;
  categorias: CategoriaPublicaNodo[];
  ofertas: ProductoPublico[];
  nuevos: ProductoPublico[];
  destacados: ProductoPublico[];
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
