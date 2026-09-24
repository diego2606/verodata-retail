import { SKU_SEGMENTOS, type SkuSegmento } from '../constants/atributos';

/** Quita acentos y todo lo que no sea alfanumérico, en mayúsculas. */
function alfanumerico(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Código de un token para el SKU. Devuelve '' si no hay valor utilizable. */
export function codigoSegmento(
  token: SkuSegmento,
  prefijo: string | null,
  atributos: Record<string, string>
): string {
  if (token === 'CATEGORIA') return alfanumerico(prefijo ?? '').slice(0, 6);
  const valor = atributos[token] ?? '';
  if (!valor) return '';
  if (token === 'STORAGE_CAPACITY') return soloDigitos(valor).slice(0, 6) || alfanumerico(valor).slice(0, 3);
  if (token === 'BRAND') return alfanumerico(valor).slice(0, 2);
  if (token === 'MODEL') return alfanumerico(valor).slice(0, 12);
  // COLOR, SIZE, CAPACITY, GENDER, LINE → 2-3 caracteres.
  return alfanumerico(valor).slice(0, 3);
}

/**
 * HU031: genera el SKU estructurado a partir de la plantilla de la categoría.
 * Ej.: ['CATEGORIA','BRAND','MODEL','STORAGE_CAPACITY','COLOR'] + TEC →
 * TEC-AP-15PM-256-NEG
 */
export function generarSkuEstructurado(
  segmentos: readonly string[],
  prefijo: string | null,
  atributos: Record<string, string>
): string {
  const partes = segmentos
    .filter((t): t is SkuSegmento => (SKU_SEGMENTOS as readonly string[]).includes(t))
    .map((token) => codigoSegmento(token, prefijo, atributos))
    .filter(Boolean);
  return partes.join('-').slice(0, 50);
}
