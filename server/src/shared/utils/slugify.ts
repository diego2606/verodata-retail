/**
 * Normaliza un texto a slug URL: minúsculas, sin acentos ni caracteres
 * especiales, separado por guiones. Ej: "Calzado Niños" → "calzado-ninos".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
