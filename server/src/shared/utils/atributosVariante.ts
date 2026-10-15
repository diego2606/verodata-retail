/**
 * Normalización de atributos de variante (HU026).
 *
 * Fuente única compartida entre el catálogo de SKUs y el de Productos Modelo
 * para que "Negro", "negro" y "NEGRO" no convivan como variantes distintas.
 */
export function normalizarValorAtributo(valor: string): string {
  return valor
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100)
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_match, sep: string, caracter: string) => sep + caracter.toUpperCase());
}

/**
 * Deja solo las claves de atributo indicadas (o el whitelist global) sin valores
 * vacíos, aplicando `normalizarValorAtributo`. El orden de las claves sigue el
 * de `claves` para que el resultado sea determinista.
 */
export function normalizarAtributos(
  input: Record<string, string> | undefined,
  claves: readonly string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;
  for (const key of claves) {
    const raw = input[key]?.trim();
    if (!raw) continue;
    const value = normalizarValorAtributo(raw);
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Clave canónica de una combinación de atributos: pares `CLAVE=Valor`
 * ordenados alfabéticamente y unidos por `|`. Espeja la función SQL
 * `combinar_atributos` que respalda el índice único (migración 017).
 */
export function combinacionCanonica(atributos: Record<string, string>): string {
  return Object.keys(atributos)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((key) => `${key}=${atributos[key]}`)
    .join('|');
}
