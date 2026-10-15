import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Contenedor horizontal estándar del Storefront (ancho de la tienda). */
export const CONTENEDOR_TIENDA = 'mx-auto w-full max-w-[1320px] px-lg';

/** Contenedor interno de las secciones full-bleed de la portada (contenido 1312px). */
export const CONTENEDOR_SECCION = 'mx-auto w-full max-w-[1312px] px-lg';

/** minúsculas + sin acentos, para comparar texto de forma tolerante. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
