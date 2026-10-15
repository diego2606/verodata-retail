import { describe, it, expect } from 'vitest';
import { crearLineaVacia, lineasReducer, validarLineas } from './lineasReducer';
import type { LineaDraft } from '../../../types/reposicion.types';

function linea(partial: Partial<LineaDraft> = {}): LineaDraft {
  return { key: 'k1', producto_id: 'p1', costo_unitario: '10', cantidad_pedida: '2', ...partial };
}

describe('lineasReducer (HU036 CA10)', () => {
  it('agrega una línea nueva con cantidad 1', () => {
    const estado = lineasReducer([], { type: 'agregar', key: 'nueva' });
    expect(estado).toHaveLength(1);
    expect(estado[0]).toEqual(crearLineaVacia('nueva'));
    expect(estado[0].cantidad_pedida).toBe('1');
  });

  it('edita solo el campo indicado de la línea', () => {
    const estado = lineasReducer([linea()], { type: 'editar', key: 'k1', campo: 'costo_unitario', valor: '99' });
    expect(estado[0].costo_unitario).toBe('99');
    expect(estado[0].cantidad_pedida).toBe('2');
  });

  it('quita la línea por su key', () => {
    const estado = lineasReducer([linea({ key: 'a' }), linea({ key: 'b' })], { type: 'quitar', key: 'a' });
    expect(estado.map((l) => l.key)).toEqual(['b']);
  });

  it('limpia todas las líneas', () => {
    expect(lineasReducer([linea(), linea({ key: 'b' })], { type: 'limpiar' })).toEqual([]);
  });

  it('ignora acciones desconocidas', () => {
    const original = [linea()];
    expect(
      lineasReducer(original, { type: 'otra' } as unknown as Parameters<typeof lineasReducer>[1])
    ).toBe(original);
  });
});

describe('validarLineas (HU036 CA10)', () => {
  it('exige al menos una línea', () => {
    expect(validarLineas([])).toBe('Agrega al menos un producto a la orden.');
  });

  it('exige producto en cada línea', () => {
    expect(validarLineas([linea({ producto_id: '' })])).toBe('Selecciona un producto en cada línea.');
  });

  it('rechaza productos repetidos', () => {
    expect(validarLineas([linea({ key: 'a' }), linea({ key: 'b' })])).toBe(
      'No repitas el mismo producto en la orden.'
    );
  });

  it('rechaza cantidad 0', () => {
    expect(validarLineas([linea({ cantidad_pedida: '0' })])).toBe(
      'La cantidad debe ser mayor a 0 en todas las líneas.'
    );
  });

  it('rechaza costo negativo', () => {
    expect(validarLineas([linea({ costo_unitario: '-5' })])).toBe(
      'El costo unitario no puede ser negativo.'
    );
  });

  it('acepta líneas válidas y distintas', () => {
    expect(
      validarLineas([linea({ key: 'a', producto_id: 'p1' }), linea({ key: 'b', producto_id: 'p2' })])
    ).toBeNull();
  });
});
