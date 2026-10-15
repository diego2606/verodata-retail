import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Contenedor horizontal estándar del Storefront (ancho de la tienda). */
export const CONTENEDOR_TIENDA = 'mx-auto w-full max-w-[1320px] px-lg';
