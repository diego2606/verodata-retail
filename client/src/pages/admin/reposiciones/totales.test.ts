import { describe, it, expect } from 'vitest';
import { aNumero, calcularTotales, redondear, subtotalLinea } from './totales';
import type { LineaDraft } from '../../../types/reposicion.types';

function linea(partial: Partial<LineaDraft> = {}): LineaDraft {
  return { key: 'k', producto_id: 'p1', costo_unitario: '', cantidad_pedida: '', ...partial };
}

describe('redondear / aNumero', () => {
  it('redondea a 2 decimales', () => {
    expect(redondear(30.015)).toBe(30.02);
    expect(redondear(95.5)).toBe(95.5);
  });

  it('convierte textos vacíos o inválidos a 0', () => {
    expect(aNumero('')).toBe(0);
    expect(aNumero('abc')).toBe(0);
    expect(aNumero('12.5')).toBe(12.5);
  });
});

describe('subtotalLinea', () => {
  it('multiplica costo por cantidad', () => {
    expect(subtotalLinea(linea({ costo_unitario: '12.5', cantidad_pedida: '4' }))).toBe(50);
  });

  it('devuelve 0 mientras faltan datos', () => {
    expect(subtotalLinea(linea({ costo_unitario: '', cantidad_pedida: '4' }))).toBe(0);
    expect(subtotalLinea(linea({ costo_unitario: '10', cantidad_pedida: '' }))).toBe(0);
  });
});

describe('calcularTotales (HU036 CA10)', () => {
  it('acumula unidades y costo con líneas completas', () => {
    const lineas = [
      linea({ key: 'a', costo_unitario: '10.005', cantidad_pedida: '3' }),
      linea({ key: 'b', costo_unitario: '47.75', cantidad_pedida: '2' }),
    ];
    expect(calcularTotales(lineas)).toEqual({ unidades: 5, costoTotal: 125.52 });
  });

  it('ignora las líneas incompletas', () => {
    const lineas = [linea({ costo_unitario: '', cantidad_pedida: '' }), linea({ costo_unitario: '5', cantidad_pedida: '2' })];
    expect(calcularTotales(lineas)).toEqual({ unidades: 2, costoTotal: 10 });
  });

  it('devuelve ceros con una lista vacía', () => {
    expect(calcularTotales([])).toEqual({ unidades: 0, costoTotal: 0 });
  });
});
