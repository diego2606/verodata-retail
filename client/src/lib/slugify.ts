/**
 * Normaliza un texto a slug URL (mismo criterio que el backend).
 * Ej: "Calzado Niños" → "calzado-ninos".
 */
export function slugify(input: string): string {
  const normalizado = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-');

  // S8786: recorte por índice en vez de regex anclado al final (`-+$` provoca
  // backtracking cuadrático sobre una racha de guiones).
  const sinInicial = normalizado.startsWith('-') ? normalizado.slice(1) : normalizado;
  return sinInicial.endsWith('-') ? sinInicial.slice(0, -1) : sinInicial;
}
