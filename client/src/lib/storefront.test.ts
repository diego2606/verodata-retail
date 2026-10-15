import { describe, it, expect } from 'vitest';
import {
  aplanarCategorias,
  construirQueryCatalogo,
  formatearPrecio,
  soloOfertas,
} from './storefront';
import type { CategoriaPublicaNodo, ProductoPublico } from '../types/storefront.types';

function producto(over: Partial<ProductoPublico> = {}): ProductoPublico {
  return {
    id: 'p1',
    categoria_id: 1,
    categoria_nombre: 'Tecnología',
    categoria_slug: 'tecnologia',
    sku: 'TEC-001',
    nombre: 'Laptop',
    descripcion: null,
    precio_regular: 100,
    precio_oferta: null,
    descuento_pct: 0,
    imagen_url: null,
    modelo: null,
    atributos: {},
    disponible: true,
    stock_total: 1,
    variantes: 1,
    ...over,
  };
}

describe('formatearPrecio', () => {
  it('formatea en soles peruanos con dos decimales', () => {
    expect(formatearPrecio(3999)).toMatch(/^S\/\s3,999\.00$/);
    expect(formatearPrecio(249.9)).toMatch(/^S\/\s249\.90$/);
  });

  it('agrupa los miles', () => {
    expect(formatearPrecio(12345.6)).toMatch(/^S\/\s12,345\.60$/);
  });
});

describe('construirQueryCatalogo', () => {
  it('devuelve cadena vacía sin filtros', () => {
    expect(construirQueryCatalogo({})).toBe('');
  });

  it('incluye solo los filtros informados', () => {
    const query = construirQueryCatalogo({ pagina: 2, limite: 24 });
    expect(query).toBe('?pagina=2&limite=24');
  });

  it('serializa búsqueda, categoría y rango de precios', () => {
    const query = construirQueryCatalogo({
      search: 'laptop pro',
      categoria_id: 3,
      precio_min: 100,
      precio_max: 2500,
      pagina: 1,
      limite: 24,
    });

    expect(query).toContain('search=laptop+pro');
    expect(query).toContain('categoria_id=3');
    expect(query).toContain('precio_min=100');
    expect(query).toContain('precio_max=2500');
  });

  it('respeta el precio 0 como filtro válido', () => {
    expect(construirQueryCatalogo({ precio_min: 0 })).toBe('?precio_min=0');
  });
});

describe('aplanarCategorias', () => {
  const arbol: CategoriaPublicaNodo[] = [
    {
      id: 1,
      nombre: 'Tecnología',
      slug: 'tecnologia',
      descripcion: null,
      categoria_padre_id: null,
      hijos: [
        {
          id: 2,
          nombre: 'Laptops',
          slug: 'laptops',
          descripcion: null,
          categoria_padre_id: 1,
          hijos: [
            {
              id: 3,
              nombre: 'Gaming',
              slug: 'gaming',
              descripcion: null,
              categoria_padre_id: 2,
              hijos: [],
            },
          ],
        },
      ],
    },
    { id: 4, nombre: 'Calzado', slug: 'calzado', descripcion: null, categoria_padre_id: null, hijos: [] },
  ];

  it('aplana el árbol conservando el nivel de anidación', () => {
    expect(aplanarCategorias(arbol)).toEqual([
      { id: 1, nombre: 'Tecnología', nivel: 0 },
      { id: 2, nombre: 'Laptops', nivel: 1 },
      { id: 3, nombre: 'Gaming', nivel: 2 },
      { id: 4, nombre: 'Calzado', nivel: 0 },
    ]);
  });

  it('devuelve lista vacía sin categorías', () => {
    expect(aplanarCategorias([])).toEqual([]);
  });
});

describe('soloOfertas', () => {
  it('filtra los productos con descuento', () => {
    const oferta = producto({ id: 'p1', descuento_pct: 25 });
    const normal = producto({ id: 'p2', descuento_pct: 0 });

    expect(soloOfertas([oferta, normal])).toEqual([oferta]);
  });
});
