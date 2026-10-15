import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify (espejo del backend)', () => {
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

  it('conserva la ñ y otros diacríticos no descomponibles como texto plano', () => {
    expect(slugify('Piñata')).toBe('pinata');
  });

  // Regresión S8786: el recorte de extremos ya no usa un regex anclado al final
  // (`-+$`), que degradaba cuadráticamente con una racha larga de guiones.
  it('no se degrada con una racha muy larga de guiones (S8786)', () => {
    const racha = '-'.repeat(30_000);
    const inicio = performance.now();
    const resultado = slugify(`${racha}Producto${racha}`);

    expect(resultado).toBe('producto');
    expect(performance.now() - inicio).toBeLessThan(1000);
  });
});
