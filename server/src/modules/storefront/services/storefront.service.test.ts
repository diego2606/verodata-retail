import { describe, expect, it } from 'vitest';
import {
  agruparCatalogo,
  calcularDescuentoPct,
  claveGrupo,
  paginar,
} from './storefront.service';
import { CatalogoFila } from '../repositories/storefront.repository';

function fila(parcial: Partial<CatalogoFila>): CatalogoFila {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    categoria_id: 1,
    categoria_nombre: 'Zapatillas',
    categoria_slug: 'zapatillas',
    sku: 'ZAP-001',
    nombre: 'Zapatilla Urbana',
    descripcion: null,
    precio_regular: 249.9,
    precio_oferta: null,
    imagen_url: null,
    modelo: null,
    atributos: {},
    stock_actual: 0,
    creado_en: new Date('2026-01-01T00:00:00Z'),
    ...parcial,
  };
}

describe('calcularDescuentoPct (HU013 CA02)', () => {
  it('calcula el ahorro redondeado', () => {
    expect(calcularDescuentoPct(249.9, 149.9)).toBe(40);
  });

  it('devuelve 0 sin oferta, con oferta inválida o precio base 0', () => {
    expect(calcularDescuentoPct(100, null)).toBe(0);
    expect(calcularDescuentoPct(100, 100)).toBe(0);
    expect(calcularDescuentoPct(100, 120)).toBe(0);
    expect(calcularDescuentoPct(0, 0)).toBe(0);
  });
});

describe('claveGrupo (§7: variantes por modelo ignorando SIZE)', () => {
  it('ignora la talla para agrupar', () => {
    const a = claveGrupo(fila({ modelo: 'Runner', atributos: { COLOR: 'Negro', SIZE: '40' } }));
    const b = claveGrupo(fila({ modelo: 'Runner', atributos: { COLOR: 'Negro', SIZE: '42' } }));
    expect(a).toBe(b);
  });

  it('separa por color', () => {
    const a = claveGrupo(fila({ modelo: 'Runner', atributos: { COLOR: 'Negro', SIZE: '40' } }));
    const b = claveGrupo(fila({ modelo: 'Runner', atributos: { COLOR: 'Blanco', SIZE: '40' } }));
    expect(a).not.toBe(b);
  });

  it('un producto sin modelo es su propia ficha', () => {
    const a = claveGrupo(fila({ id: 'a', modelo: null }));
    const b = claveGrupo(fila({ id: 'b', modelo: null }));
    expect(a).not.toBe(b);
  });
});

describe('agruparCatalogo (HU013)', () => {
  it('colapsa tallas en una ficha sumando stock', () => {
    const fichas = agruparCatalogo([
      fila({ id: 'a', modelo: 'Runner', atributos: { COLOR: 'Negro', SIZE: '40' }, stock_actual: 2 }),
      fila({ id: 'b', modelo: 'Runner', atributos: { COLOR: 'Negro', SIZE: '42' }, stock_actual: 3 }),
      fila({ id: 'c', modelo: 'Runner', atributos: { COLOR: 'Blanco', SIZE: '40' }, stock_actual: 0 }),
    ]);

    expect(fichas).toHaveLength(2);
    const negro = fichas.find((f) => f.atributos.COLOR === 'Negro');
    expect(negro?.stock_total).toBe(5);
    expect(negro?.variantes).toBe(2);
    expect(negro?.disponible).toBe(true);
  });

  it('marca agotado cuando el stock total es 0', () => {
    const fichas = agruparCatalogo([
      fila({ id: 'a', modelo: 'Mochila', atributos: { COLOR: 'Gris' }, stock_actual: 0 }),
    ]);
    expect(fichas[0].disponible).toBe(false);
  });
});

describe('paginar', () => {
  it('corta el arreglo y calcula las páginas', () => {
    const resultado = paginar([1, 2, 3, 4, 5], 2, 2);
    expect(resultado.items).toEqual([3, 4]);
    expect(resultado.pagina).toBe(2);
    expect(resultado.total_paginas).toBe(3);
    expect(resultado.total).toBe(5);
  });

  it('siempre reporta al menos una página', () => {
    expect(paginar([], 1, 24).total_paginas).toBe(1);
  });
});
