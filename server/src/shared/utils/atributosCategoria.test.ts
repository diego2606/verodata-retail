import { describe, it, expect } from 'vitest';
import { ATRIBUTOS_DEFAULT, atributosSugeridosPara } from './atributosCategoria';

describe('atributosSugeridosPara', () => {
  it('ropa y calzado → color, talla y género', () => {
    expect(atributosSugeridosPara('Zapatillas')).toEqual(['COLOR', 'SIZE', 'GENDER']);
    expect(atributosSugeridosPara('Polos')).toEqual(['COLOR', 'SIZE', 'GENDER']);
    expect(atributosSugeridosPara('Ropa Deportiva')).toEqual(['COLOR', 'SIZE', 'GENDER']);
  });

  it('tecnología → color, capacidad, almacenamiento, modelo y línea', () => {
    expect(atributosSugeridosPara('Celulares y Smartphones')).toContain('STORAGE_CAPACITY');
    expect(atributosSugeridosPara('TVs')).toContain('STORAGE_CAPACITY');
    expect(atributosSugeridosPara('Consolas')).toContain('CAPACITY');
  });

  it('electrodomésticos no se confunde con electrónica', () => {
    expect(atributosSugeridosPara('Electrodomésticos')).toEqual(['COLOR', 'CAPACITY', 'MODEL', 'LINE']);
    expect(atributosSugeridosPara('Electrónica, Audio y Video')).toContain('STORAGE_CAPACITY');
  });

  it('accesorios de consolas gana la regla de tecnología sobre la de moda', () => {
    expect(atributosSugeridosPara('Accesorios para Consolas')).toContain('STORAGE_CAPACITY');
    expect(atributosSugeridosPara('Accesorios de Moda')).toEqual(['COLOR', 'SIZE', 'GENDER']);
  });

  it('deportes, hogar, belleza y juguetes', () => {
    expect(atributosSugeridosPara('Fútbol')).toEqual(['COLOR', 'SIZE', 'CAPACITY']);
    expect(atributosSugeridosPara('Muebles para el Hogar')).toEqual(['COLOR', 'SIZE', 'MODEL']);
    expect(atributosSugeridosPara('Perfumes y Colonias')).toEqual(['COLOR', 'CAPACITY']);
    expect(atributosSugeridosPara('Peluches')).toEqual(['COLOR', 'SIZE']);
  });

  it('ignora acentos y mayúsculas', () => {
    expect(atributosSugeridosPara('  FÚTBOL ')).toEqual(['COLOR', 'SIZE', 'CAPACITY']);
  });

  it('usa el set por defecto para nombres desconocidos', () => {
    expect(atributosSugeridosPara('Categoría rara XYZ')).toEqual([...ATRIBUTOS_DEFAULT]);
  });
});
