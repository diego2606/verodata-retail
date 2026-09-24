import { atributosSugeridosPara } from './atributosCategoria';

/**
 * HU029: resuelve los atributos permitidos efectivos de una categoría.
 *
 * `cadenas` es la secuencia de conjuntos propios desde la categoría hacia sus
 * ancestros (incluyéndola). El primer conjunto no nulo gana (herencia por el
 * ancestro más cercano). Si ninguno define atributos, se usa la heurística por
 * nombre como fallback.
 */
export function resolverAtributosEfectivos(
  cadenas: ReadonlyArray<readonly string[] | null>,
  nombreCategoria: string
): string[] {
  for (const propios of cadenas) {
    if (propios !== null) return [...propios];
  }
  return atributosSugeridosPara(nombreCategoria);
}

/**
 * HU030: resuelve los valores sugeridos efectivos por atributo. Combina desde
 * el ancestro más lejano al más cercano, de modo que la categoría más específica
 * sobrescribe los valores de sus ancestros.
 */
export function resolverValoresSugeridos(
  cadenas: ReadonlyArray<Record<string, string[]> | null>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (let i = cadenas.length - 1; i >= 0; i -= 1) {
    const mapa = cadenas[i];
    if (!mapa) continue;
    for (const [key, valores] of Object.entries(mapa)) {
      if (Array.isArray(valores) && valores.length > 0) out[key] = valores;
    }
  }
  return out;
}
