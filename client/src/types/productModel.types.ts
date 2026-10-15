import type { TipoAtributo } from './atributo.types';

/** Atributos de variante: { COLOR: 'Negro', SIZE: '42' }. */
export type AtributosVariante = Record<string, string>;

/** SKU hijo devuelto por la API. */
export interface VarianteModelo {
  id: string;
  sku: string;
  codigo_barras: string | null;
  atributos: AtributosVariante;
  precio_regular: number;
  precio_oferta: number | null;
  activo: boolean;
  stock_actual: number;
  stock_minimo: number;
}

/** Producto Padre (Modelo) — información común, sin stock. */
export interface ProductoModelo {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  nombre: string;
  marca: string | null;
  modelo_codigo: string | null;
  descripcion: string | null;
  atributos_variantes: string[];
  activo: boolean;
  destacado: boolean;
  destacado_orden: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface ModeloConVariantes extends ProductoModelo {
  variantes: VarianteModelo[];
}

export interface CrearModeloPayload {
  categoria_id: number;
  nombre: string;
  marca?: string | null;
  modelo_codigo?: string | null;
  descripcion?: string | null;
  atributos_variantes?: string[];
  activo?: boolean;
}

export type ActualizarModeloPayload = Partial<CrearModeloPayload>;

/** Atributo efectivo de la categoría con sus valores del maestro (HU035). */
export interface AtributoCategoriaItem {
  codigo: string;
  nombre: string;
  tipo: TipoAtributo;
  unidad: string | null;
  valores: Array<{ valor: string; slug: string; hex: string | null }>;
}

export interface ResumenDelta {
  creadas: number;
  actualizadas: number;
  desactivadas: number;
  variantes: VarianteModelo[];
}

/** Estado de una fila de variante dentro del editor. */
export type EstadoVariante = 'existente' | 'nueva' | 'eliminada';

/**
 * Fila de la tabla vertical de variantes. Cuando `id` no es null, el SKU y los
 * atributos están bloqueados (inmutables, HU031 CA05).
 */
export interface VarianteDraft {
  key: string;
  id: string | null;
  sku: string;
  codigo_barras: string | null;
  atributos: AtributosVariante;
  precio_regular: number;
  precio_oferta: number | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  estado: EstadoVariante;
  dirty: {
    precio: boolean;
    stock: boolean;
    estadoActivo: boolean;
    barcode: boolean;
  };
}

/** Datos comunes del padre en el formulario. */
export interface ModeloDraft {
  categoria_id: number | null;
  nombre: string;
  marca: string;
  modelo_codigo: string;
  descripcion: string;
  atributos_variantes: string[];
  activo: boolean;
}

/** Cuerpo de POST /api/v1/product-models/:id/variantes/delta (HU035 CA08). */
export interface DeltaVariantesPayload {
  nuevas_variantes: Array<{
    atributos: AtributosVariante;
    sku?: string;
    codigo_barras?: string | null;
    precio_regular: number;
    precio_oferta?: number | null;
    stock_actual: number;
    stock_minimo?: number;
  }>;
  actualizar_variantes: Array<{
    sku_id: string;
    precio_regular?: number;
    precio_oferta?: number | null;
    stock_actual?: number;
    stock_minimo?: number;
    codigo_barras?: string | null;
    activo?: boolean;
  }>;
  eliminar_variantes: string[];
}
