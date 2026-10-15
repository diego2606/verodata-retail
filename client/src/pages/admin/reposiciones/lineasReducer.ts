import type { LineaDraft } from '../../../types/reposicion.types';
import { aNumero } from './totales';

/** Fila nueva con cantidad 1 por comodidad del operador. */
export function crearLineaVacia(key: string): LineaDraft {
  return { key, producto_id: '', costo_unitario: '', cantidad_pedida: '1' };
}

export type LineasAction =
  | { type: 'agregar'; key: string }
  | {
      type: 'editar';
      key: string;
      campo: 'producto_id' | 'costo_unitario' | 'cantidad_pedida';
      valor: string;
    }
  | { type: 'quitar'; key: string }
  | { type: 'limpiar' };

export function lineasReducer(state: LineaDraft[], action: LineasAction): LineaDraft[] {
  switch (action.type) {
    case 'agregar':
      return [...state, crearLineaVacia(action.key)];
    case 'editar':
      return state.map((linea) =>
        linea.key === action.key ? { ...linea, [action.campo]: action.valor } : linea
      );
    case 'quitar':
      return state.filter((linea) => linea.key !== action.key);
    case 'limpiar':
      return [];
    default:
      return state;
  }
}

/**
 * Validación previa al envío (misma regla que el backend, para dar feedback
 * inmediato sin esperar el `VALIDATION_ERROR`).
 */
export function validarLineas(lineas: LineaDraft[]): string | null {
  if (lineas.length === 0) return 'Agrega al menos un producto a la orden.';

  if (lineas.some((linea) => !linea.producto_id)) {
    return 'Selecciona un producto en cada línea.';
  }

  const ids = lineas.map((linea) => linea.producto_id);
  if (new Set(ids).size !== ids.length) {
    return 'No repitas el mismo producto en la orden.';
  }

  if (lineas.some((linea) => aNumero(linea.cantidad_pedida) <= 0)) {
    return 'La cantidad debe ser mayor a 0 en todas las líneas.';
  }

  if (lineas.some((linea) => aNumero(linea.costo_unitario) < 0)) {
    return 'El costo unitario no puede ser negativo.';
  }

  return null;
}
