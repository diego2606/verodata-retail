import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/product.repository', () => ({
  productRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    existeSku: vi.fn(),
    existeCategoria: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
  },
}));

import { productService } from './product.service';
import { productRepository } from '../repositories/product.repository';
import type { ProductoRow } from '../repositories/product.repository';

const repo = productRepository as unknown as {
  listar: ReturnType<typeof vi.fn>;
  obtenerPorId: ReturnType<typeof vi.fn>;
  existeSku: ReturnType<typeof vi.fn>;
  existeCategoria: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
};

const row: ProductoRow = {
  id: 'p1',
  categoria_id: 1,
  categoria_nombre: 'Calzado',
  sku: 'SKU-1',
  nombre: 'Zapatilla',
  descripcion: 'Descripción',
  precio_regular: 100,
  precio_oferta: null,
  imagen_url: null,
  activo: true,
  stock_actual: 0,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

const input = {
  categoria_id: 1,
  sku: 'sku-1',
  nombre: 'Zapatilla',
  descripcion: 'Descripción',
  precio_regular: 100,
};

describe('productService.crear (HU007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeSku.mockResolvedValue(false);
    repo.existeCategoria.mockResolvedValue(true);
    repo.crear.mockResolvedValue('p1');
    repo.obtenerPorId.mockResolvedValue(row);
  });

  it('normaliza el SKU a mayúsculas y crea el producto', async () => {
    const result = await productService.crear(input);
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'SKU-1', precio_oferta: null, imagen_url: null })
    );
  });

  it('rechaza SKU duplicado con SKU_ALREADY_EXISTS', async () => {
    repo.existeSku.mockResolvedValue(true);
    const result = await productService.crear(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SKU_ALREADY_EXISTS');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza categoría inexistente con CATEGORY_NOT_FOUND', async () => {
    repo.existeCategoria.mockResolvedValue(false);
    const result = await productService.crear(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CATEGORY_NOT_FOUND');
  });
});

describe('productService.listar (HU007)', () => {
  it('devuelve el listado de productos', async () => {
    repo.listar.mockResolvedValue([row]);
    const result = await productService.listar({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
  });
});

describe('productService.actualizar (HU008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.obtenerPorId.mockResolvedValue(row);
    repo.existeCategoria.mockResolvedValue(true);
    repo.actualizar.mockResolvedValue(undefined);
  });

  it('devuelve RESOURCE_NOT_FOUND si el producto no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await productService.actualizar('p-x', { nombre: 'Nuevo' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('rechaza oferta >= regular con INVALID_PRICE (valores resultantes)', async () => {
    repo.obtenerPorId.mockResolvedValue({ ...row, precio_oferta: 90 });
    const result = await productService.actualizar('p1', { precio_regular: 80 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_PRICE');
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it('actualiza y devuelve el producto', async () => {
    const result = await productService.actualizar('p1', { nombre: 'Zapatilla Pro' });
    expect(result.success).toBe(true);
    expect(repo.actualizar).toHaveBeenCalledOnce();
  });
});
