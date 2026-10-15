import type { LineaDraft } from '../../../types/reposicion.types';

/** Redondeo a 2 decimales (el dinero no se acumula en float sin normalizar). */
export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Convierte el texto de un input numérico a número (vacío/ inválido → 0). */
export function aNumero(valor: string): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

/** Subtotal de una línea: costo unitario × cantidad. */
export function subtotalLinea(linea: LineaDraft): number {
  return redondear(aNumero(linea.costo_unitario) * aNumero(linea.cantidad_pedida));
}

export interface TotalesOrden {
  unidades: number;
  costoTotal: number;
}

/** Totales en vivo del formulario (HU036 CA10). */
export function calcularTotales(lineas: LineaDraft[]): TotalesOrden {
  let unidades = 0;
  let costoTotal = 0;
  for (const linea of lineas) {
    unidades += aNumero(linea.cantidad_pedida);
    costoTotal += aNumero(linea.costo_unitario) * aNumero(linea.cantidad_pedida);
  }
  return { unidades, costoTotal: redondear(costoTotal) };
}
