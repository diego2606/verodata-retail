/**
 * Normaliza un texto a slug URL: minúsculas, sin acentos ni caracteres
 * especiales, separado por guiones. Ej: "Calzado Niños" → "calzado-ninos".
 */
export function slugify(input: string): string {
  const normalizado = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');

  // S8786: el colapso anterior deja como máximo un guion en cada extremo, así que
  // se recorta con slice en lugar de con un regex anclado al final: `-+$` obliga
  // al motor a retroceder en cada posición sobre una racha de guiones (cuadrático).
  const sinInicial = normalizado.startsWith('-') ? normalizado.slice(1) : normalizado;
  return sinInicial.endsWith('-') ? sinInicial.slice(0, -1) : sinInicial;
}
