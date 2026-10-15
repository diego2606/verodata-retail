import { describe, it, expect } from 'vitest';
import { varianteDesdeSku, variantesReducer } from './variantesReducer';

const sku = {
  id: 'sku-1',
  sku: 'ZAP-NEG-41',
  codigo_barras: null,
  atributos: { COLOR: 'Negro', SIZE: '41' },
  precio_regular: 100,
  precio_oferta: null,
  activo: true,
  stock_actual: 3,
  stock_minimo: 5,
};

describe('variantesReducer (HU035)', () => {
  it('convierte un SKU en fila bloqueada (estado existente)', () => {
    const draft = varianteDesdeSku(sku);
    expect(draft).toMatchObject({ id: 'sku-1', estado: 'existente', sku: 'ZAP-NEG-41' });
    expect(draft.dirty).toEqual({ precio: false, stock: false, estadoActivo: false, barcode: false });
  });

  it('inyecta una fila nueva al final', () => {
    const state = variantesReducer([], {
      type: 'agregar',
      key: 'k1',
      atributos: { COLOR: 'Negro', SIZE: '42' },
      campos: { precio_regular: 89.99, stock_actual: 10 },
    });
    expect(state).toHaveLength(1);
    expect(state[0]).toMatchObject({ id: null, estado: 'nueva', stock_actual: 10, stock_minimo: 5 });
  });

  it('marca dirty solo el grupo de campo editado', () => {
    const [state] = [
      variantesReducer([varianteDesdeSku(sku)], {
        type: 'editar',
        key: 'sku-1',
        campo: 'stock_actual',
        valor: 9,
      }),
    ];
    expect(state[0].stock_actual).toBe(9);
    expect(state[0].dirty.stock).toBe(true);
    expect(state[0].dirty.precio).toBe(false);
  });

  it('desactivar un SKU existente lo marca como eliminado', () => {
    const state = variantesReducer([varianteDesdeSku(sku)], { type: 'toggleActivo', key: 'sku-1' });
    expect(state[0].activo).toBe(false);
    expect(state[0].estado).toBe('eliminada');
    expect(state[0].dirty.estadoActivo).toBe(true);
  });

  it('restaurar devuelve el estado existente y activa la fila', () => {
    const eliminada = reducenEliminada();
    const state = variantesReducer([eliminada], { type: 'restaurar', key: 'sku-1' });
    expect(state[0].estado).toBe('existente');
    expect(state[0].activo).toBe(true);
  });
});

function reducenEliminada() {
  const [state] = [
    variantesReducer([varianteDesdeSku(sku)], { type: 'marcarEliminar', key: 'sku-1' }),
  ];
  return state[0];
}
