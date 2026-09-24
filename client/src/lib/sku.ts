import type { AtributosVariante } from '../types/product.types';
import { SKU_SEGMENTOS } from './atributos';

/** Quita acentos y todo lo que no sea alfanumérico, en mayúsculas. */
function limpiar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

export interface SkuParts {
  categoria?: string;
  modelo?: string;
  atributos?: AtributosVariante;
  /** Sufijo opcional para desambiguar combinaciones. */
  sufijo?: number | string;
}

/**
 * HU027: genera un SKU sugerido y determinista a partir de
 * categoría + modelo + valores de atributo. Editable por el usuario.
 */
export function generarSkuSugerido(parts: SkuParts): string {
  const partes: string[] = [];

  const categoria = limpiar(parts.categoria ?? '').slice(0, 3);
  if (categoria) partes.push(categoria);

  const modelo = limpiar(parts.modelo ?? '').slice(0, 4);
  if (modelo) partes.push(modelo);

  if (parts.atributos) {
    for (const key of Object.keys(parts.atributos).sort()) {
      const codigo = limpiar(parts.atributos[key] ?? '').slice(0, 3);
      if (codigo) partes.push(codigo);
    }
  }

  const base = (partes.join('-') || 'SKU').slice(0, 47);
  if (parts.sufijo === undefined || parts.sufijo === '') return base;
  return `${base}-${parts.sufijo}`.slice(0, 50);
}

/**
 * HU031: genera el SKU estructurado desde la plantilla de la categoría.
 * Espejo del backend; sirve para previsualizar mientras se llena el formulario.
 */
export function generarSkuEstructurado(
  segmentos: readonly string[] | null | undefined,
  prefijo: string | null | undefined,
  atributos: AtributosVariante
): string {
  const partes = (segmentos ?? [])
    .filter(token => (SKU_SEGMENTOS as readonly string[]).includes(token))
    .map(token => {
      if (token === 'CATEGORIA') return limpiar(prefijo ?? '').slice(0, 6);
      const valor = atributos[token] ?? '';
      if (!valor) return '';
      if (token === 'STORAGE_CAPACITY') return soloDigitos(valor).slice(0, 6) || limpiar(valor).slice(0, 3);
      if (token === 'BRAND') return limpiar(valor).slice(0, 2);
      if (token === 'MODEL') return limpiar(valor).slice(0, 12);
      return limpiar(valor).slice(0, 3);
    })
    .filter(Boolean);
  return partes.join('-').slice(0, 50);
}
