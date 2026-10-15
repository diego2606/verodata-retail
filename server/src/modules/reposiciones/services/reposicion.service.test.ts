import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/reposicion.repository', () => ({
  reposicionRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    listarDetalle: vi.fn(),
    listarProductosFaltantes: vi.fn(),
    crear: vi.fn(),
    recibir: vi.fn(),
    cancelar: vi.fn(),
  },
}));

vi.mock('../../proveedores/repositories/proveedor.repository', () => ({
  proveedorRepository: {
    obtenerPorId: vi.fn(),
  },
}));

import { reposicionService } from './reposicion.service';
import { reposicionRepository, type ReposicionRow } from '../repositories/reposicion.repository';
import { proveedorRepository } from '../../proveedores/repositories/proveedor.repository';
import {
  OrdenNoEncontradaError,
  OrdenNoPendienteError,
  ProductoSinInventarioError,
} from './reposicion.errors';
import type { CrearReposicionInput } from '../schemas/reposicion.schemas';

type Mock = ReturnType<typeof vi.fn>;
const repo = reposicionRepository as unknown as Record<string, Mock>;
const provRepo = proveedorRepository as unknown as { obtenerPorId: Mock };

const ORDEN_ID = '33333333-3333-3333-3333-333333333333';
const PROVEEDOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SKU_A = '11111111-1111-1111-1111-111111111111';
const SKU_B = '22222222-2222-2222-2222-222222222222';

const orden: ReposicionRow = {
  id: ORDEN_ID,
  proveedor_id: PROVEEDOR_ID,
  proveedor_nombre: 'Distribuidora Andina',
  estado: 'PENDIENTE',
  fecha_emision: new Date(),
  fecha_estimada_arribo: null,
  notas: null,
  costo_total: 105.5,
  unidades_totales: 5,
  usuario_id: null,
  motivo_cancelacion: null,
  recibido_en: null,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

function input(overrides: Partial<CrearReposicionInput> = {}): CrearReposicionInput {
  return {
    proveedor_id: PROVEEDOR_ID,
    detalles: [
      { producto_id: SKU_A, costo_unitario: 10.005, cantidad_pedida: 3 },
      { producto_id: SKU_B, costo_unitario: 47.75, cantidad_pedida: 2 },
    ],
    ...overrides,
  } as CrearReposicionInput;
}

beforeEach(() => {
  vi.clearAllMocks();
  provRepo.obtenerPorId.mockResolvedValue({ id: PROVEEDOR_ID, nombre_empresa: 'Distribuidora Andina' });
  repo.listarProductosFaltantes.mockResolvedValue([]);
  repo.obtenerPorId.mockResolvedValue(orden);
  repo.listarDetalle.mockResolvedValue([]);
  repo.crear.mockResolvedValue(ORDEN_ID);
  repo.recibir.mockResolvedValue({ lineas_actualizadas: 2, unidades_ingresadas: 5 });
  repo.cancelar.mockResolvedValue(true);
  repo.listar.mockResolvedValue({ items: [orden], total: 1 });
});

describe('reposicionService.listar (HU036 CA07)', () => {
  it('devuelve la página con su total', async () => {
    const result = await reposicionService.listar({ page: 2, limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ items: [orden], total: 1, page: 2, limit: 10 });
    }
  });
});

describe('reposicionService.obtener (HU036 CA08)', () => {
  it('devuelve ORDEN_NOT_FOUND si no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await reposicionService.obtener(ORDEN_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ORDEN_NOT_FOUND');
  });

  it('devuelve la orden con su detalle', async () => {
    repo.listarDetalle.mockResolvedValue([{ id: 'd1', sku: 'ZAP-NEG-42' }]);
    const result = await reposicionService.obtener(ORDEN_ID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.detalles).toHaveLength(1);
  });
});

describe('reposicionService.crear (HU036 CA02/CA03)', () => {
  it('rechaza un proveedor inexistente', async () => {
    provRepo.obtenerPorId.mockResolvedValue(null);
    const result = await reposicionService.crear(input(), null);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('PROVEEDOR_NOT_FOUND');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza productos que no existen', async () => {
    repo.listarProductosFaltantes.mockResolvedValue([SKU_B]);
    const result = await reposicionService.crear(input(), null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PRODUCTO_NOT_FOUND');
      expect(result.error.details).toMatchObject({ productos: [SKU_B] });
    }
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('calcula los subtotales, el costo total redondeado y las unidades', async () => {
    await reposicionService.crear(input(), null);
    const enviado = repo.crear.mock.calls[0][0];
    // 10.005 * 3 = 30.015 -> 30.02 ; 47.75 * 2 = 95.5  -> total 125.52
    expect(enviado.costo_total).toBe(125.52);
    expect(enviado.unidades_totales).toBe(5);
    expect(enviado.detalles).toEqual([
      { producto_id: SKU_A, costo_unitario: 10.005, cantidad_pedida: 3 },
      { producto_id: SKU_B, costo_unitario: 47.75, cantidad_pedida: 2 },
    ]);
  });

  it('normaliza notas vacías a null y conserva la fecha', async () => {
    await reposicionService.crear(input({ notas: '   ', fecha_estimada_arribo: '2026-11-01' }), 'u1');
    const enviado = repo.crear.mock.calls[0][0];
    expect(enviado.notas).toBeNull();
    expect(enviado.fecha_estimada_arribo).toBe('2026-11-01');
    expect(enviado.usuario_id).toBe('u1');
  });

  it('devuelve la orden creada con su detalle recargado', async () => {
    repo.listarDetalle.mockResolvedValue([{ id: 'd1' }]);
    const result = await reposicionService.crear(input(), null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(ORDEN_ID);
      expect(result.data.detalles).toHaveLength(1);
    }
  });
});

describe('reposicionService.recibir (HU036 CA04/CA05)', () => {
  it('devuelve el resumen de recepción', async () => {
    const result = await reposicionService.recibir(ORDEN_ID, 'u1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ id: ORDEN_ID, estado: 'RECIBIDO', unidades_ingresadas: 5 });
    }
    expect(repo.recibir).toHaveBeenCalledWith(ORDEN_ID, 'u1');
  });

  it('mapea los errores de dominio a códigos de negocio', async () => {
    const casos: Array<[Error, string]> = [
      [new OrdenNoEncontradaError(ORDEN_ID), 'ORDEN_NOT_FOUND'],
      [new OrdenNoPendienteError('RECIBIDO'), 'ORDEN_NO_PENDIENTE'],
      [new ProductoSinInventarioError(SKU_A), 'PRODUCTO_SIN_INVENTARIO'],
    ];
    for (const [error, code] of casos) {
      repo.recibir.mockRejectedValue(error);
      const result = await reposicionService.recibir(ORDEN_ID, null);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe(code);
    }
  });

  it('propaga errores no controlados', async () => {
    repo.recibir.mockRejectedValue(new Error('boom'));
    await expect(reposicionService.recibir(ORDEN_ID, null)).rejects.toThrow('boom');
  });
});

describe('reposicionService.cancelar (HU036 CA09)', () => {
  it('devuelve ORDEN_NOT_FOUND si no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await reposicionService.cancelar(ORDEN_ID, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ORDEN_NOT_FOUND');
  });

  it('rechaza cancelar una orden ya RECIBIDA', async () => {
    repo.obtenerPorId.mockResolvedValue({ ...orden, estado: 'RECIBIDO' });
    const result = await reposicionService.cancelar(ORDEN_ID, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ORDEN_NO_PENDIENTE');
    expect(repo.cancelar).not.toHaveBeenCalled();
  });

  it('cancela una orden PENDIENTE con motivo', async () => {
    const result = await reposicionService.cancelar(ORDEN_ID, { motivo: ' proveedor sin stock ' });
    expect(result.success).toBe(true);
    expect(repo.cancelar).toHaveBeenCalledWith(ORDEN_ID, 'proveedor sin stock');
  });

  it('informa si la orden cambió de estado durante la operación', async () => {
    repo.cancelar.mockResolvedValue(false);
    repo.obtenerPorId
      .mockResolvedValueOnce(orden)
      .mockResolvedValueOnce({ ...orden, estado: 'RECIBIDO' });
    const result = await reposicionService.cancelar(ORDEN_ID, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ORDEN_NO_PENDIENTE');
  });
});
