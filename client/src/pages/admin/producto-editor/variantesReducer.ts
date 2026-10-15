import type { VarianteDraft, VarianteModelo } from '../../../types/productModel.types';

export type VariantesAction =
  | { type: 'cargar'; variantes: VarianteDraft[] }
  | {
      type: 'agregar';
      key: string;
      atributos: Record<string, string>;
      campos: Partial<Pick<VarianteDraft, 'sku' | 'codigo_barras' | 'precio_regular' | 'precio_oferta' | 'stock_actual' | 'stock_minimo'>>;
    }
  | {
      type: 'editar';
      key: string;
      campo: 'precio_regular' | 'precio_oferta' | 'stock_actual' | 'stock_minimo' | 'codigo_barras';
      valor: number | string | null;
    }
  | { type: 'toggleActivo'; key: string }
  | { type: 'marcarEliminar'; key: string }
  | { type: 'restaurar'; key: string };

/** Convierte un SKU persistido en fila editable (con SKU/atributos bloqueados). */
export function varianteDesdeSku(v: VarianteModelo): VarianteDraft {
  return {
    key: v.id,
    id: v.id,
    sku: v.sku,
    codigo_barras: v.codigo_barras,
    atributos: { ...v.atributos },
    precio_regular: v.precio_regular,
    precio_oferta: v.precio_oferta,
    stock_actual: v.stock_actual,
    stock_minimo: v.stock_minimo,
    activo: v.activo,
    estado: 'existente',
    dirty: { precio: false, stock: false, estadoActivo: false, barcode: false },
  };
}

function aplicarEdicion(
  variante: VarianteDraft,
  action: Extract<VariantesAction, { type: 'editar' }>
): VarianteDraft {
  const dirty = { ...variante.dirty };
  if (action.campo === 'precio_regular' || action.campo === 'precio_oferta') dirty.precio = true;
  if (action.campo === 'stock_actual' || action.campo === 'stock_minimo') dirty.stock = true;
  if (action.campo === 'codigo_barras') dirty.barcode = true;
  return { ...variante, [action.campo]: action.valor, dirty };
}

/** Reducer de la tabla vertical de variantes (sin matrices). */
export function variantesReducer(state: VarianteDraft[], action: VariantesAction): VarianteDraft[] {
  switch (action.type) {
    case 'cargar':
      return action.variantes;
    case 'agregar': {
      const nueva: VarianteDraft = {
        key: action.key,
        id: null,
        sku: action.campos.sku ?? '',
        codigo_barras: action.campos.codigo_barras ?? null,
        atributos: action.atributos,
        precio_regular: action.campos.precio_regular ?? 0,
        precio_oferta: action.campos.precio_oferta ?? null,
        stock_actual: action.campos.stock_actual ?? 0,
        stock_minimo: action.campos.stock_minimo ?? 5,
        activo: true,
        estado: 'nueva',
        dirty: { precio: true, stock: true, estadoActivo: false, barcode: false },
      };
      return [...state, nueva];
    }
    case 'editar':
      return state.map((v) => (v.key === action.key ? aplicarEdicion(v, action) : v));
    case 'toggleActivo':
      return state.map((v) => {
        if (v.key !== action.key) return v;
        const activo = !v.activo;
        return {
          ...v,
          activo,
          // Un SKU existente desactivado se resolverá con `eliminar_variantes`.
          estado: v.id === null ? v.estado : activo ? 'existente' : 'eliminada',
          dirty: { ...v.dirty, estadoActivo: v.id !== null },
        };
      });
    case 'marcarEliminar':
      return state.map((v) =>
        v.key === action.key ? { ...v, estado: 'eliminada', activo: v.id === null ? v.activo : false } : v
      );
    case 'restaurar':
      return state.map((v) =>
        v.key === action.key ? { ...v, estado: v.id === null ? 'nueva' : 'existente', activo: true } : v
      );
    default:
      return state;
  }
}
