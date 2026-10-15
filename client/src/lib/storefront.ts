import { apiClient, type ApiResponse } from './apiClient';
import type {
  CatalogoPaginado,
  CategoriaPublicaNodo,
  DetalleProducto,
  FiltrosCatalogo,
  ProductoPublico,
} from '../types/storefront.types';

/** Precio en soles peruanos: "S/ 249.90". */
export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(valor);
}

/** Construye el querystring del catálogo con los filtros no vacíos. */
export function construirQueryCatalogo(filtros: FiltrosCatalogo): string {
  const params = new URLSearchParams();
  if (filtros.search) params.set('search', filtros.search);
  if (filtros.categoria_id) params.set('categoria_id', String(filtros.categoria_id));
  if (filtros.precio_min !== undefined) params.set('precio_min', String(filtros.precio_min));
  if (filtros.precio_max !== undefined) params.set('precio_max', String(filtros.precio_max));
  if (filtros.pagina) params.set('pagina', String(filtros.pagina));
  if (filtros.limite) params.set('limite', String(filtros.limite));
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Aplana el árbol de categorías en una lista con nivel de indentación. */
export interface CategoriaOpcion {
  id: number;
  nombre: string;
  nivel: number;
}

export function aplanarCategorias(
  nodos: CategoriaPublicaNodo[],
  nivel = 0,
  salida: CategoriaOpcion[] = []
): CategoriaOpcion[] {
  for (const nodo of nodos) {
    salida.push({ id: nodo.id, nombre: nodo.nombre, nivel });
    aplanarCategorias(nodo.hijos, nivel + 1, salida);
  }
  return salida;
}

export const storefrontApi = {
  listarProductos(filtros: FiltrosCatalogo, signal?: AbortSignal): Promise<ApiResponse<CatalogoPaginado>> {
    return apiClient.get<CatalogoPaginado>(
      `/api/v1/storefront/products${construirQueryCatalogo(filtros)}`,
      signal
    );
  },

  listarCategorias(signal?: AbortSignal): Promise<ApiResponse<CategoriaPublicaNodo[]>> {
    return apiClient.get<CategoriaPublicaNodo[]>('/api/v1/storefront/categories', signal);
  },

  detalle(id: string, signal?: AbortSignal): Promise<ApiResponse<DetalleProducto>> {
    return apiClient.get<DetalleProducto>(`/api/v1/storefront/products/${id}`, signal);
  },
};

/** Productos en oferta (con descuento > 0). */
export function soloOfertas(productos: ProductoPublico[]): ProductoPublico[] {
  return productos.filter((producto) => producto.descuento_pct > 0);
}
