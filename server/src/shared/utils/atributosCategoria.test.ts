import { describe, it, expect } from 'vitest';
import { ATRIBUTOS_DEFAULT, atributosSugeridosPara } from './atributosCategoria';

describe('atributosSugeridosPara', () => {
  it('calzado usa talla numérica', () => {
    expect(atributosSugeridosPara('Zapatillas')).toEqual(['COLOR', 'TALLA_CALZADO', 'GENDER', 'LINE']);
    expect(atributosSugeridosPara('Zapatos')).toContain('TALLA_CALZADO');
  });

  it('ropa usa talla de letras', () => {
    expect(atributosSugeridosPara('Polos')).toEqual(['COLOR', 'SIZE', 'GENDER', 'LINE']);
    expect(atributosSugeridosPara('Ropa Deportiva')).toEqual(['COLOR', 'SIZE', 'GENDER', 'LINE']);
  });

  it('tecnología usa almacenamiento digital', () => {
    expect(atributosSugeridosPara('Celulares y Smartphones')).toEqual(['COLOR', 'STORAGE_CAPACITY', 'LINE']);
    expect(atributosSugeridosPara('TVs')).toContain('STORAGE_CAPACITY');
    expect(atributosSugeridosPara('Consolas')).toContain('STORAGE_CAPACITY');
  });

  it('electrodomésticos usa litros y kg, y no se confunde con electrónica', () => {
    expect(atributosSugeridosPara('Electrodomésticos')).toEqual([
      'COLOR',
      'CAPACIDAD_LITROS',
      'CAPACIDAD_KG',
    ]);
    expect(atributosSugeridosPara('Electrónica, Audio y Video')).toContain('STORAGE_CAPACITY');
  });

  it('accesorios de consolas gana la regla de tecnología sobre la de moda', () => {
    expect(atributosSugeridosPara('Accesorios para Consolas')).toContain('STORAGE_CAPACITY');
    expect(atributosSugeridosPara('Accesorios de Moda')).toEqual(['COLOR', 'SIZE', 'GENDER', 'LINE']);
  });

  it('deportes, hogar, belleza y juguetes', () => {
    expect(atributosSugeridosPara('Fútbol')).toEqual(['COLOR', 'SIZE', 'GENDER']);
    expect(atributosSugeridosPara('Muebles para el Hogar')).toEqual(['COLOR']);
    expect(atributosSugeridosPara('Perfumes y Colonias')).toEqual(['COLOR', 'CONTENIDO_ML']);
    expect(atributosSugeridosPara('Peluches')).toEqual(['COLOR', 'SIZE']);
  });

  it('ignora acentos y mayúsculas', () => {
    expect(atributosSugeridosPara('  FÚTBOL ')).toEqual(['COLOR', 'SIZE', 'GENDER']);
  });

  it('usa el set por defecto para nombres desconocidos', () => {
    expect(atributosSugeridosPara('Categoría rara XYZ')).toEqual([...ATRIBUTOS_DEFAULT]);
  });
});
