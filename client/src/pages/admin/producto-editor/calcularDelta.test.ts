import { describe, it, expect } from 'vitest';
import { calcularDelta, deltaVacio } from './calcularDelta';
import { varianteDesdeSku } from './variantesReducer';
import type { VarianteDraft } from '../../../types/productModel.types';

function existente(overrides: Partial<VarianteDraft> = {}): VarianteDraft {
  const base = varianteDesdeSku({
    id: 'sku-1',
    sku: 'ZAP-NEG-42',
    codigo_barras: null,
    atributos: { COLOR: 'Negro', SIZE: '42' },
    precio_regular: 89.99,
    precio_oferta: null,
    activo: true,
    stock_actual: 10,
    stock_minimo: 5,
  });
  return { ...base, ...overrides };
}

function nueva(overrides: Partial<VarianteDraft> = {}): VarianteDraft {
  return {
    key: 'nueva-1',
    id: null,
    sku: '',
    codigo_barras: null,
    atributos: { COLOR: 'Negro', SIZE: '43' },
    precio_regular: 89.99,
    precio_oferta: null,
    stock_actual: 4,
    stock_minimo: 5,
    activo: true,
    estado: 'nueva',
    dirty: { precio: true, stock: true, estadoActivo: false, barcode: false },
    ...overrides,
  };
}

describe('calcularDelta (HU035 CA08)', () => {
  it('sin cambios devuelve un delta vacío', () => {
    const original = existente();
    const delta = calcularDelta([original], [{ ...original }]);
    expect(delta).toEqual({ nuevas_variantes: [], actualizar_variantes: [], eliminar_variantes: [] });
    expect(deltaVacio(delta)).toBe(true);
  });

  it('envía solo el precio modificado de un SKU existente', () => {
    const original = existente();
    const actual = { ...original, precio_regular: 95, dirty: { ...original.dirty, precio: true } };
    expect(calcularDelta([original], [actual])).toEqual({
      nuevas_variantes: [],
      actualizar_variantes: [{ sku_id: 'sku-1', precio_regular: 95, precio_oferta: null }],
      eliminar_variantes: [],
    });
  });

  it('envía la "talla olvidada" como una variante nueva', () => {
    const delta = calcularDelta([], [nueva()]);
    expect(delta.nuevas_variantes).toEqual([
      {
        atributos: { COLOR: 'Negro', SIZE: '43' },
        codigo_barras: null,
        precio_regular: 89.99,
        precio_oferta: null,
        stock_actual: 4,
        stock_minimo: 5,
      },
    ]);
  });

  it('envía los IDs de las variantes eliminadas (borrado lógico)', () => {
    const original = existente();
    const delta = calcularDelta([original], [{ ...original, estado: 'eliminada', activo: false }]);
    expect(delta.eliminar_variantes).toEqual(['sku-1']);
    expect(delta.actualizar_variantes).toEqual([]);
  });

  it('descarta una fila nueva marcada como eliminada antes de guardar', () => {
    const delta = calcularDelta([], [nueva({ estado: 'eliminada' })]);
    expect(delta.nuevas_variantes).toEqual([]);
    expect(deltaVacio(delta)).toBe(true);
  });

  it('nunca envía SKU ni atributos en actualizar_variantes', () => {
    const original = existente();
    const actual = {
      ...original,
      sku: 'OTRO',
      atributos: { COLOR: 'Azul' },
      stock_actual: 3,
      dirty: { ...original.dirty, stock: true },
    };
    const delta = calcularDelta([original], [actual]);
    expect(delta.actualizar_variantes).toEqual([
      { sku_id: 'sku-1', stock_actual: 3, stock_minimo: 5 },
    ]);
  });
});
