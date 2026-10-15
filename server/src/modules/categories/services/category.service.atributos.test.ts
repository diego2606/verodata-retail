import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/category.repository', () => ({
  categoryRepository: {
    obtenerCadenaAtributos: vi.fn(),
  },
}));

vi.mock('../../atributos/repositories/atributo.repository', () => ({
  atributoRepository: {
    listarAtributos: vi.fn(),
    listarValores: vi.fn(),
  },
}));

import { categoryService } from './category.service';
import { categoryRepository } from '../repositories/category.repository';
import { atributoRepository } from '../../atributos/repositories/atributo.repository';

const catRepo = categoryRepository as unknown as {
  obtenerCadenaAtributos: ReturnType<typeof vi.fn>;
};
const atrRepo = atributoRepository as unknown as {
  listarAtributos: ReturnType<typeof vi.fn>;
  listarValores: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  atrRepo.listarAtributos.mockResolvedValue([
    { id: 1, codigo: 'COLOR', nombre: 'Color', tipo: 'COLOR', es_variante: true, unidad: null, activo: true, orden: 1 },
    { id: 2, codigo: 'SIZE', nombre: 'Talla', tipo: 'TEXTO', es_variante: true, unidad: null, activo: true, orden: 2 },
    { id: 3, codigo: 'RAM', nombre: 'Memoria RAM', tipo: 'TEXTO', es_variante: true, unidad: 'GB', activo: true, orden: 3 },
  ]);
  atrRepo.listarValores.mockResolvedValue([
    { id: 10, atributo_id: 1, valor: 'Negro', slug: 'negro', hex: '#000000', meta: null, activo: true, orden: 0 },
    { id: 11, atributo_id: 1, valor: 'Blanco', slug: 'blanco', hex: '#ffffff', meta: null, activo: false, orden: 1 },
    { id: 12, atributo_id: 2, valor: '42', slug: '42', hex: null, meta: null, activo: true, orden: 0 },
  ]);
});

describe('categoryService.obtenerAtributos (HU035)', () => {
  it('devuelve RESOURCE_NOT_FOUND si la categoría no existe', async () => {
    catRepo.obtenerCadenaAtributos.mockResolvedValue(null);
    const result = await categoryService.obtenerAtributos(999);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('resuelve los atributos efectivos con sus valores activos', async () => {
    catRepo.obtenerCadenaAtributos.mockResolvedValue({
      nombre: 'Zapatillas',
      cadenas: [['COLOR', 'SIZE']],
      cadenasValores: [null],
    });

    const result = await categoryService.obtenerAtributos(1);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual([
      {
        codigo: 'COLOR',
        nombre: 'Color',
        tipo: 'COLOR',
        unidad: null,
        valores: [{ valor: 'Negro', slug: 'negro', hex: '#000000' }],
      },
      {
        codigo: 'SIZE',
        nombre: 'Talla',
        tipo: 'TEXTO',
        unidad: null,
        valores: [{ valor: '42', slug: '42', hex: null }],
      },
    ]);
  });
});
