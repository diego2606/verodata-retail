import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/inventory.repository', () => ({
  inventoryRepository: {
    obtenerPorProducto: vi.fn(),
    ajustar: vi.fn(),
    listarAlertas: vi.fn(),
  },
}));

import { inventoryService } from './inventory.service';
import { inventoryRepository } from '../repositories/inventory.repository';

const repo = inventoryRepository as unknown as {
  obtenerPorProducto: ReturnType<typeof vi.fn>;
  ajustar: ReturnType<typeof vi.fn>;
  listarAlertas: ReturnType<typeof vi.fn>;
};

const fila = {
  producto_id: 'p1',
  stock_actual: 15,
  stock_minimo: 5,
  actualizado_en: new Date(),
};

describe('inventoryService.ajustar (HU010/HU011)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registra el ajuste y devuelve el inventario actualizado', async () => {
    repo.ajustar.mockResolvedValue(fila);
    const result = await inventoryService.ajustar('p1', { ajuste: 15 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stock_actual).toBe(15);
    expect(repo.ajustar).toHaveBeenCalledWith('p1', 15, null);
  });

  it('devuelve RESOURCE_NOT_FOUND si el producto no existe', async () => {
    repo.ajustar.mockResolvedValue(null);
    repo.obtenerPorProducto.mockResolvedValue(null);
    const result = await inventoryService.ajustar('p-x', { ajuste: 5 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('devuelve INSUFFICIENT_STOCK si el ajuste dejaría el stock negativo', async () => {
    repo.ajustar.mockResolvedValue(null);
    repo.obtenerPorProducto.mockResolvedValue(fila);
    const result = await inventoryService.ajustar('p1', { ajuste: -99 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('permite configurar el stock mínimo', async () => {
    repo.ajustar.mockResolvedValue({ ...fila, stock_minimo: 20 });
    const result = await inventoryService.ajustar('p1', { ajuste: 1, stock_minimo: 20 });
    expect(result.success).toBe(true);
    expect(repo.ajustar).toHaveBeenCalledWith('p1', 1, 20);
  });
});

describe('inventoryService.listarAlertas (HU012)', () => {
  it('devuelve las alertas de stock', async () => {
    repo.listarAlertas.mockResolvedValue([
      { producto_id: 'p1', sku: 'S1', nombre: 'A', categoria_nombre: 'C', stock_actual: 2, stock_minimo: 5, faltante: 3 },
    ]);
    const result = await inventoryService.listarAlertas();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
  });
});
