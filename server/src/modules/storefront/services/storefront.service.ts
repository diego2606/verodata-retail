import {
  storefrontRepository,
  CatalogoFila,
  CategoriaPublicaFila,
  BannerVigenteRow,
  ColorFila,
} from '../repositories/storefront.repository';
import { ListarCatalogoQuery } from '../schemas/storefront.schemas';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** Producto tal como lo consume el Storefront público. */
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
  /** HU013 CA02: porcentaje de ahorro (0 si no hay oferta). */
  descuento_pct: number;
  imagen_url: string | null;
  modelo: string | null;
  atributos: Record<string, string>;
  /** HU013 CA03: disponible cuando hay existencias. */
  disponible: boolean;
  stock_total: number;
  /** Nº de variantes (SKUs) agrupadas en esta ficha. */
  variantes: number;
}

export interface CategoriaPublicaNodo extends CategoriaPublicaFila {
  hijos: CategoriaPublicaNodo[];
}

/** Agrupa categorías planas en un árbol jerárquico (padres con `hijos`). */
export function construirArbolCategorias(filas: CategoriaPublicaFila[]): CategoriaPublicaNodo[] {
  const nodos = new Map<number, CategoriaPublicaNodo>();
  for (const fila of filas) nodos.set(fila.id, { ...fila, hijos: [] });

  const raices: CategoriaPublicaNodo[] = [];
  for (const nodo of nodos.values()) {
    const padre = nodo.categoria_padre_id !== null ? nodos.get(nodo.categoria_padre_id) : undefined;
    if (padre) padre.hijos.push(nodo);
    else raices.push(nodo);
  }
  return raices;
}

export interface Paginado<T> {
  items: T[];
  pagina: number;
  total_paginas: number;
  total: number;
}

/** HU034: banner listo para renderizar en la portada. */
export type BannerPublico = BannerVigenteRow;

/** HU034: contenido completo de la portada pública. */
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

/** HU013 CA02: porcentaje de ahorro redondeado (0 si no aplica oferta). */
export function calcularDescuentoPct(precioRegular: number, precioOferta: number | null): number {
  if (precioOferta === null || precioOferta >= precioRegular || precioRegular <= 0) return 0;
  return Math.round((1 - precioOferta / precioRegular) * 100);
}

/**
 * HU013 / .ai/02 §7: la tienda agrupa las variantes del mismo modelo ignorando
 * la talla (SIZE): se lista una sola ficha por (modelo, atributos − SIZE).
 * Un producto sin `modelo` es su propia ficha.
 */
export function claveGrupo(fila: CatalogoFila): string {
  const atributos: string[] = [];
  for (const [key, value] of Object.entries(fila.atributos ?? {})) {
    if (key.toUpperCase() === 'SIZE') continue;
    atributos.push(`${key}=${value}`);
  }
  atributos.sort();
  const familia = fila.modelo && fila.modelo.trim() ? fila.modelo : fila.id;
  return `${familia}::${atributos.join('|')}`;
}

function aPublico(fila: CatalogoFila, stockTotal: number, variantes: number): ProductoPublico {
  return {
    id: fila.id,
    categoria_id: fila.categoria_id,
    categoria_nombre: fila.categoria_nombre,
    categoria_slug: fila.categoria_slug,
    sku: fila.sku,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio_regular: fila.precio_regular,
    precio_oferta: fila.precio_oferta,
    descuento_pct: calcularDescuentoPct(fila.precio_regular, fila.precio_oferta),
    imagen_url: fila.imagen_url,
    modelo: fila.modelo,
    atributos: fila.atributos ?? {},
    disponible: stockTotal > 0,
    stock_total: stockTotal,
    variantes,
  };
}

/** Agrupa las filas por ficha y compone la vista pública (orden: más recientes). */
export function agruparCatalogo(filas: CatalogoFila[]): ProductoPublico[] {
  const grupos = new Map<string, CatalogoFila[]>();
  for (const fila of filas) {
    const clave = claveGrupo(fila);
    const existente = grupos.get(clave);
    if (existente) existente.push(fila);
    else grupos.set(clave, [fila]);
  }

  const agrupadas: Array<{ ficha: ProductoPublico; creadoEn: number }> = [];
  for (const lista of grupos.values()) {
    // Representante: la variante con más stock; desempate por la más antigua.
    const representante = lista.reduce((mejor, actual) => {
      if (actual.stock_actual > mejor.stock_actual) return actual;
      if (actual.stock_actual === mejor.stock_actual && actual.creado_en < mejor.creado_en) {
        return actual;
      }
      return mejor;
    });
    const stockTotal = lista.reduce((suma, f) => suma + f.stock_actual, 0);
    agrupadas.push({
      ficha: aPublico(representante, stockTotal, lista.length),
      creadoEn: representante.creado_en.getTime(),
    });
  }

  agrupadas.sort((a, b) => b.creadoEn - a.creadoEn);
  return agrupadas.map((item) => item.ficha);
}

/** Paginación en memoria (el catálogo del proyecto es acotado). */
export function paginar<T>(items: T[], pagina: number, limite: number): Paginado<T> {
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  const inicio = (pagina - 1) * limite;
  return {
    items: items.slice(inicio, inicio + limite),
    pagina,
    total_paginas: totalPaginas,
    total,
  };
}

/** Precio con el que se filtra por rango: la oferta si existe, si no el regular. */
function precioEfectivo(fila: CatalogoFila): number {
  return fila.precio_oferta ?? fila.precio_regular;
}

export const storefrontService = {
  /** HU013/HU016: catálogo público paginado con filtros. */
  async listar(
    filtros: ListarCatalogoQuery
  ): Promise<ApiResponse<Paginado<ProductoPublico>>> {
    const filas = await storefrontRepository.listarCatalogo(filtros);

    const filtradas = filas.filter((fila) => {
      const precio = precioEfectivo(fila);
      if (filtros.precio_min !== undefined && precio < filtros.precio_min) return false;
      if (filtros.precio_max !== undefined && precio > filtros.precio_max) return false;
      return true;
    });

    const fichas = agruparCatalogo(filtradas);
    return {
      success: true,
      message: 'Catálogo obtenido correctamente',
      data: paginar(fichas, filtros.pagina, filtros.limite),
    };
  },

  /** HU013 CA01: árbol de categorías activas para la navegación. */
  async categorias(): Promise<ApiResponse<CategoriaPublicaNodo[]>> {
    const filas = await storefrontRepository.listarCategoriasActivas();
    return {
      success: true,
      message: 'Categorías obtenidas correctamente',
      data: construirArbolCategorias(filas),
    };
  },

  /** HU034: compone la portada pública completa en una sola respuesta. */
  async home(): Promise<ApiResponse<HomeData>> {
    const [banners, configFilas, categoriaFilas, filas, destacadosFilas] = await Promise.all([
      storefrontRepository.listarBannersVigentes(),
      storefrontRepository.listarConfig(),
      storefrontRepository.listarCategoriasActivas(),
      storefrontRepository.listarCatalogo({ pagina: 1, limite: 1 }),
      storefrontRepository.listarDestacados(),
    ]);

    const config: Record<string, unknown> = {};
    for (const fila of configFilas) config[fila.clave] = fila.valor;

    const fichas = agruparCatalogo(filas);

    return {
      success: true,
      message: 'Portada obtenida correctamente',
      data: {
        banners: {
          hero: banners.filter((b) => b.ubicacion === 'HERO'),
          ticker: banners.filter((b) => b.ubicacion === 'TICKER'),
          banda: banners.filter((b) => b.ubicacion === 'BANDA_EDITORIAL'),
        },
        config,
        categorias: construirArbolCategorias(categoriaFilas),
        ofertas: fichas.filter((f) => f.descuento_pct > 0).slice(0, 8),
        nuevos: fichas.slice(0, 8),
        destacados: agruparCatalogo(destacadosFilas).slice(0, 8),
      },
    };
  },

  /** Colores activos para los swatches del Storefront. */
  async colores(): Promise<ApiResponse<ColorFila[]>> {
    const colores = await storefrontRepository.listarColoresActivos();
    return { success: true, message: 'Colores obtenidos correctamente', data: colores };
  },

  /** HU013: detalle de una ficha pública con sus variantes hermanas. */
  async detalle(
    id: string
  ): Promise<ApiResponse<{ producto: ProductoPublico; variantes: ProductoPublico[] }>> {
    const fila = await storefrontRepository.obtenerPorId(id);
    if (!fila) {
      return fallo('RESOURCE_NOT_FOUND', 'El producto no existe o no está disponible');
    }
    const hermanas = fila.modelo
      ? await storefrontRepository.listarHermanas(fila.modelo, fila.id)
      : [];
    return {
      success: true,
      message: 'Producto obtenido correctamente',
      data: {
        producto: aPublico(fila, fila.stock_actual, 1),
        variantes: hermanas.map((h) => aPublico(h, h.stock_actual, 1)),
      },
    };
  },
};
