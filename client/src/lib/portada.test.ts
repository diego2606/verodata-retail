import { describe, it, expect } from 'vitest';
import { Footprints, GraduationCap, Shirt, ShoppingBag, Tag, Watch } from 'lucide-react';
import { FRANJA_DEFECTO, iconoDepartamento, leerFranja } from './portada';

describe('leerFranja', () => {
  it('normaliza una franja válida', () => {
    const valor = [{ titulo: 'Envíos', texto: 'A todo el Perú' }];
    expect(leerFranja(valor)).toEqual([{ titulo: 'Envíos', texto: 'A todo el Perú' }]);
  });

  it('descarta ítems sin la forma esperada', () => {
    const valor = [{ titulo: 'Ok', texto: 'Sí' }, { titulo: 'Sin texto' }, 'basura', null];
    expect(leerFranja(valor)).toEqual([{ titulo: 'Ok', texto: 'Sí' }]);
  });

  it('descarta ítems con título vacío', () => {
    expect(leerFranja([{ titulo: '   ', texto: 'x' }])).toEqual([]);
  });

  it('devuelve lista vacía ante valores que no son arreglo', () => {
    expect(leerFranja(undefined)).toEqual([]);
    expect(leerFranja(null)).toEqual([]);
    expect(leerFranja('texto')).toEqual([]);
    expect(leerFranja({ titulo: 'x' })).toEqual([]);
  });

  it('expone un respaldo con cuatro beneficios', () => {
    expect(FRANJA_DEFECTO).toHaveLength(4);
    expect(FRANJA_DEFECTO.every((item) => item.titulo && item.texto)).toBe(true);
  });
});

describe('iconoDepartamento', () => {
  it('reconoce calzado', () => {
    expect(iconoDepartamento('Calzado')).toBe(Footprints);
    expect(iconoDepartamento('Zapatillas urbanas')).toBe(Footprints);
  });

  it('reconoce indumentaria', () => {
    expect(iconoDepartamento('Ropa')).toBe(Shirt);
    expect(iconoDepartamento('Poleras')).toBe(Shirt);
  });

  it('ignora acentos y mayúsculas', () => {
    expect(iconoDepartamento('ÚTILES ESCOLARES')).toBe(GraduationCap);
    expect(iconoDepartamento('relojería')).toBe(Watch);
  });

  it('reconoce accesorios por palabra clave', () => {
    expect(iconoDepartamento('Accesorios')).toBe(ShoppingBag);
  });

  it('usa Tag como respaldo para un departamento desconocido', () => {
    expect(iconoDepartamento('Joyería fina')).toBe(Tag);
    expect(iconoDepartamento('')).toBe(Tag);
  });
});
