import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('normaliza mayúsculas y espacios', () => {
    expect(slugify('Calzado Deportivo')).toBe('calzado-deportivo');
  });

  it('quita acentos', () => {
    expect(slugify('Niños Ropa')).toBe('ninos-ropa');
  });

  it('quita caracteres especiales', () => {
    expect(slugify('Zapatos & Botas!!')).toBe('zapatos-botas');
  });

  it('colapsa guiones y recorta los extremos', () => {
    expect(slugify('  --Hola   Mundo-- ')).toBe('hola-mundo');
  });

  it('devuelve vacío si no hay caracteres alfanuméricos', () => {
    expect(slugify('¡¡¡')).toBe('');
  });
});
