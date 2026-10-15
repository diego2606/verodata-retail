import { describe, it, expect } from 'vitest';
import { generarSkuEstructurado, generarSkuSugerido } from './sku';

describe('generarSkuSugerido (HU027)', () => {
  it('compone categoría + modelo + atributos', () => {
    expect(
      generarSkuSugerido({
        categoria: 'Calzado',
        modelo: 'Runner',
        atributos: { COLOR: 'Negro', SIZE: '40' },
      })
    ).toBe('CAL-RUNN-NEG-40');
  });

  it('usa SKU como base cuando no hay datos', () => {
    expect(generarSkuSugerido({})).toBe('SKU');
    expect(generarSkuSugerido({ categoria: '   ' })).toBe('SKU');
  });

  it('quita acentos de los valores', () => {
    expect(generarSkuSugerido({ categoria: 'Electrónica', atributos: { COLOR: 'Ámbar' } })).toBe(
      'ELE-AMB'
    );
  });

  it('añade el sufijo para desambiguar combinaciones', () => {
    expect(generarSkuSugerido({ categoria: 'Calzado', sufijo: 2 })).toBe('CAL-2');
  });

  it('ignora un sufijo vacío', () => {
    expect(generarSkuSugerido({ categoria: 'Calzado', sufijo: '' })).toBe('CAL');
  });

  // Regresión S2871: sin comparador explícito el orden de las claves dependía del
  // código UTF-16 y el SKU sugerido dejaba de ser determinista.
  it('es determinista aunque los atributos lleguen en otro orden', () => {
    const primero = generarSkuSugerido({
      categoria: 'Calzado',
      modelo: 'Runner',
      atributos: { SIZE: '40', COLOR: 'Negro' },
    });
    const segundo = generarSkuSugerido({
      categoria: 'Calzado',
      modelo: 'Runner',
      atributos: { COLOR: 'Negro', SIZE: '40' },
    });

    expect(primero).toBe(segundo);
    expect(primero).toBe('CAL-RUNN-NEG-40');
  });

  it('acota la longitud total a 50 caracteres', () => {
    const sku = generarSkuSugerido({
      categoria: 'Electrodomesticos',
      modelo: 'LavadoraAvanzada',
      atributos: { COLOR: 'Blanco', SIZE: 'XL', LINE: 'Premium' },
      sufijo: 'extra-largo',
    });

    expect(sku.length).toBeLessThanOrEqual(50);
  });
});

describe('generarSkuEstructurado (HU031, espejo del backend)', () => {
  it('respeta el orden de la plantilla de la categoría', () => {
    expect(
      generarSkuEstructurado(
        ['CATEGORIA', 'BRAND', 'MODEL', 'STORAGE_CAPACITY', 'COLOR'],
        'TEC',
        { BRAND: 'Apple', MODEL: '15 Pro Max', STORAGE_CAPACITY: '256GB', COLOR: 'Negro' }
      )
    ).toBe('TEC-AP-15PROMAX-256-NEG');
  });

  it('descarta los tokens que no son plantilla válida', () => {
    expect(generarSkuEstructurado(['COLOR', 'NO_EXISTE'], null, { COLOR: 'Rojo' })).toBe('ROJ');
  });

  it('omite los segmentos sin valor', () => {
    expect(generarSkuEstructurado(['BRAND', 'COLOR'], null, { COLOR: 'Rojo' })).toBe('ROJ');
  });

  it('devuelve cadena vacía sin plantilla', () => {
    expect(generarSkuEstructurado(null, null, {})).toBe('');
    expect(generarSkuEstructurado(undefined, null, {})).toBe('');
  });
});
