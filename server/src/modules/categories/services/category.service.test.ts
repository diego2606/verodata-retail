import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/category.repository', () => ({
  categoryRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    existeNombre: vi.fn(),
    existeSlug: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    tieneProductos: vi.fn(),
    eliminar: vi.fn(),
  },
}));

import { categoryService } from './category.service';
import { categoryRepository } from '../repositories/category.repository';
import type { CategoriaRow } from '../repositories/category.repository';

const repo = categoryRepository as unknown as {
  obtenerPorId: ReturnType<typeof vi.fn>;
  existeNombre: ReturnType<typeof vi.fn>;
  existeSlug: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
  tieneProductos: ReturnType<typeof vi.fn>;
  eliminar: ReturnType<typeof vi.fn>;
};

const row: CategoriaRow = {
  id: 1,
  nombre: 'Calzado Deportivo',
  slug: 'calzado-deportivo',
  descripcion: null,
  activo: true,
  creado_en: new Date(),
  productos_count: 0,
};

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
    });
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

  it('eliminar borra si no tiene productos', async () => {
    repo.obtenerPorId.mockResolvedValue(row);
    repo.tieneProductos.mockResolvedValue(false);
    repo.eliminar.mockResolvedValue(undefined);
    const result = await categoryService.eliminar(1);
    expect(result.success).toBe(true);
    expect(repo.eliminar).toHaveBeenCalledWith(1);
  });
});
