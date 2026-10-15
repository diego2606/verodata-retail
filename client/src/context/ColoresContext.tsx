import React, { createContext, useContext, useMemo } from 'react';
import { useApiData } from '../lib/useApiData';
import type { ColorSwatch } from '../types/storefront.types';

/**
 * Diccionario de respaldo (nombres normalizados → hex) para que los swatches
 * se pinten aunque el nombre del atributo no esté en la tabla `colores`
 * (p. ej. datos importados en inglés). La tabla `colores` siempre tiene prioridad.
 */
const DICCIONARIO: Record<string, string> = {
  negro: '#111111',
  black: '#111111',
  blanco: '#ffffff',
  white: '#ffffff',
  rojo: '#dc2626',
  red: '#dc2626',
  azul: '#2563eb',
  blue: '#2563eb',
  verde: '#16a34a',
  green: '#16a34a',
  gris: '#9ca3af',
  gray: '#9ca3af',
  grey: '#9ca3af',
  beige: '#e7d8c9',
  marron: '#8b5e3c',
  brown: '#8b5e3c',
  rosado: '#ec4899',
  rosa: '#ec4899',
  pink: '#ec4899',
  amarillo: '#eab308',
  yellow: '#eab308',
  naranja: '#ea580c',
  orange: '#ea580c',
  morado: '#7c3aed',
  purple: '#7c3aed',
  vino: '#7f1d1d',
  bordo: '#7f1d1d',
  celeste: '#38bdf8',
  plateado: '#c0c0c0',
  silver: '#c0c0c0',
  dorado: '#d4af37',
  gold: '#d4af37',
  crema: '#f5f0e1',
  cream: '#f5f0e1',
  transparente: '#e5e7eb',
  transparent: '#e5e7eb',
};

/** minúsculas + sin acentos para comparar nombres de color. */
export function normalizarColor(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface ColoresContextValue {
  hexDeColor: (nombre: string | undefined | null) => string | null;
}

const ColoresContext = createContext<ColoresContextValue>({ hexDeColor: () => null });

export function ColoresProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const colores = useApiData<ColorSwatch[]>('/api/v1/storefront/colors');

  const mapa = useMemo(() => {
    const m = new Map<string, string>(Object.entries(DICCIONARIO));
    if (colores.estado.status === 'success') {
      for (const color of colores.estado.data) m.set(normalizarColor(color.nombre), color.hex);
    }
    return m;
  }, [colores.estado]);

  const value = useMemo<ColoresContextValue>(
    () => ({
      hexDeColor: (nombre) => (nombre ? mapa.get(normalizarColor(nombre)) ?? null : null),
    }),
    [mapa]
  );

  return <ColoresContext.Provider value={value}>{children}</ColoresContext.Provider>;
}

/** Hook para resolver el hex de un color por nombre. */
export function useColores(): ColoresContextValue {
  return useContext(ColoresContext);
}
