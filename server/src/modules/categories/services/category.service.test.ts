import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/category.repository', () => ({
  categoryRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    existeNombre: vi.fn(),
    existeSlug: vi.fn(),
    obtenerDescendientes: vi.fn(),
    obtenerArbolCategorias: vi.fn(),
    obtenerCadenaAtributos: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    tieneProductos: vi.fn(),
    tieneHijos: vi.fn(),
    eliminar: vi.fn(),
  },
}));

import { categoryService } from './category.service';
import { categoryRepository } from '../repositories/category.repository';
import type { CategoriaRow } from '../repositories/category.repository';

const repo = categoryRepository as unknown as {
  listar: ReturnType<typeof vi.fn>;
  obtenerPorId: ReturnType<typeof vi.fn>;
  existeNombre: ReturnType<typeof vi.fn>;
  existeSlug: ReturnType<typeof vi.fn>;
  obtenerDescendientes: ReturnType<typeof vi.fn>;
  obtenerArbolCategorias: ReturnType<typeof vi.fn>;
  obtenerCadenaAtributos: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
  tieneProductos: ReturnType<typeof vi.fn>;
  tieneHijos: ReturnType<typeof vi.fn>;
  eliminar: ReturnType<typeof vi.fn>;
};

const row: CategoriaRow = {
  id: 1,
  nombre: 'Calzado Deportivo',
  slug: 'calzado-deportivo',
  descripcion: null,
  categoria_padre_id: null,
  atributos_permitidos: null,
  atributos_valores: null,
  sku_prefijo: null,
  sku_segmentos: null,
  activo: true,
  creado_en: new Date(),
  productos_count: 0,
  hijos_count: 0,
};

beforeEach(() => {
  repo.obtenerArbolCategorias.mockResolvedValue([]);
  repo.obtenerCadenaAtributos.mockResolvedValue({
    nombre: 'Calzado Deportivo',
    cadenas: [null],
    cadenasValores: [null],
  });
});

describe('categoryService.crear (HU006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeNombre.mockResolvedValue(false);
    repo.existeSlug.mockResolvedValue(false);
    repo.crear.mockResolvedValue(1);
    repo.obtenerPorId.mockResolvedValue(row);
  });

  it('genera el slug normalizado a partir del nombre', async () => {
    const result = await categoryService.crear({ nombre: 'Calzado Deportivo' });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith({
      nombre: 'Calzado Deportivo',
      slug: 'calzado-deportivo',
      descripcion: null,
      categoria_padre_id: null,
      atributos_permitidos: null,
      atributos_valores: null,
      sku_prefijo: null,
      sku_segmentos: null,
    });
  });

  it('crea una subcategoría cuando el padre existe', async () => {
    repo.obtenerPorId.mockResolvedValue({ ...row, id: 5 });
    const result = await categoryService.crear({ nombre: 'Zapatillas', categoria_padre_id: 5 });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(expect.objectContaining({ categoria_padre_id: 5 }));
  });

  it('rechaza un padre inexistente con PARENT_NOT_FOUND', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await categoryService.crear({ nombre: 'Zapatillas', categoria_padre_id: 99 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('PARENT_NOT_FOUND');
  });

  it('rechaza nombre duplicado con NAME_ALREADY_EXISTS', async () => {
    repo.existeNombre.mockResolvedValue(true);
    const result = await categoryService.crear({ nombre: 'Calzado Deportivo' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NAME_ALREADY_EXISTS');
  });

  it('rechaza slug duplicado con SLUG_ALREADY_EXISTS', async () => {
    repo.existeSlug.mockResolvedValue(true);
    const result = await categoryService.crear({ nombre: 'Calzado Deportivo' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SLUG_ALREADY_EXISTS');
  });

  it('rechaza un nombre sin caracteres válidos para slug', async () => {
    const result = await categoryService.crear({ nombre: '¡¡¡' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_SLUG');
  });
});

describe('categoryService.actualizar / eliminar (HU006)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('actualizar devuelve RESOURCE_NOT_FOUND si no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await categoryService.actualizar(99, { nombre: 'Nueva' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('actualizar cambia el estado a inactivo (borrado lógico)', async () => {
    repo.obtenerPorId.mockResolvedValueOnce(row).mockResolvedValueOnce({ ...row, activo: false });
    repo.actualizar.mockResolvedValue(undefined);
    const result = await categoryService.actualizar(1, { activo: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.activo).toBe(false);
  });

  it('eliminar bloquea con CATEGORY_HAS_PRODUCTS si tiene productos', async () => {
    repo.obtenerPorId.mockResolvedValue(row);
    repo.tieneProductos.mockResolvedValue(true);
    const result = await categoryService.eliminar(1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CATEGORY_HAS_PRODUCTS');
    expect(repo.eliminar).not.toHaveBeenCalled();
  });

  it('eliminar bloquea con CATEGORY_HAS_SUBCATEGORIES si tiene subcategorías', async () => {
    repo.obtenerPorId.mockResolvedValue(row);
    repo.tieneProductos.mockResolvedValue(false);
    repo.tieneHijos.mockResolvedValue(true);
    const result = await categoryService.eliminar(1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CATEGORY_HAS_SUBCATEGORIES');
    expect(repo.eliminar).not.toHaveBeenCalled();
  });

  it('eliminar borra si no tiene productos ni subcategorías', async () => {
    repo.obtenerPorId.mockResolvedValue(row);
    repo.tieneProductos.mockResolvedValue(false);
    repo.tieneHijos.mockResolvedValue(false);
    repo.eliminar.mockResolvedValue(undefined);
    const result = await categoryService.eliminar(1);
    expect(result.success).toBe(true);
    expect(repo.eliminar).toHaveBeenCalledWith(1);
  });

  it('actualizar rechaza asignar como padre a un descendiente (ciclo)', async () => {
    repo.obtenerPorId.mockResolvedValue({ ...row, id: 1 });
    repo.obtenerDescendientes.mockResolvedValue([2, 3]);
    const result = await categoryService.actualizar(1, { categoria_padre_id: 3 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_PARENT');
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});

describe('categoryService.listar (HU029/HU030)', () => {
  it('hereda los atributos del ancestro más cercano', async () => {
    const padre: CategoriaRow = {
      ...row,
      id: 1,
      nombre: 'Ropa',
      categoria_padre_id: null,
      atributos_permitidos: ['COLOR', 'SIZE'],
      atributos_valores: { COLOR: ['Negro', 'Blanco'] },
    };
    const hija: CategoriaRow = {
      ...row,
      id: 2,
      nombre: 'Zapatillas',
      categoria_padre_id: 1,
      atributos_permitidos: null,
      atributos_valores: null,
    };
    repo.listar.mockResolvedValue([padre, hija]);
    repo.obtenerArbolCategorias.mockResolvedValue([
      {
        id: 1,
        nombre: 'Ropa',
        categoria_padre_id: null,
        atributos_permitidos: ['COLOR', 'SIZE'],
        atributos_valores: { COLOR: ['Negro', 'Blanco'] },
      },
      {
        id: 2,
        nombre: 'Zapatillas',
        categoria_padre_id: 1,
        atributos_permitidos: null,
        atributos_valores: null,
      },
    ]);

    const result = await categoryService.listar({});
    expect(result.success).toBe(true);
    if (result.success) {
      const zapatillas = result.data.find((c) => c.id === 2);
      expect(zapatillas?.atributos_sugeridos).toEqual(['COLOR', 'SIZE']);
      expect(zapatillas?.valores_sugeridos).toEqual({ COLOR: ['Negro', 'Blanco'] });
    }
  });
});
