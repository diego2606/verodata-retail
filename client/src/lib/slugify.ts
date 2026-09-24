/**
 * Normaliza un texto a slug URL (mismo criterio que el backend).
 * Ej: "Calzado Niños" → "calzado-ninos".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
