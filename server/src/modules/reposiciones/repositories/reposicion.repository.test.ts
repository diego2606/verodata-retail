import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/db', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../../../config/db';
import {
  reposicionRepository,
  type ReposicionRow,
} from './reposicion.repository';
import {
  OrdenNoEncontradaError,
  OrdenNoPendienteError,
  ProductoSinInventarioError,
} from '../services/reposicion.errors';
import type { ListarReposicionesQuery } from '../schemas/reposicion.schemas';

type Mock = ReturnType<typeof vi.fn>;
const poolMock = pool as unknown as { query: Mock; connect: Mock };

const ORDEN_ID = '33333333-3333-3333-3333-333333333333';
const SKU_A = '11111111-1111-1111-1111-111111111111';
const SKU_B = '22222222-2222-2222-2222-222222222222';

const clientQuery = vi.fn();
const clientRelease = vi.fn();
const client = { query: clientQuery, release: clientRelease };

const ordenRow: ReposicionRow = {
  id: ORDEN_ID,
  proveedor_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  proveedor_nombre: 'Distribuidora Andina',
  estado: 'PENDIENTE',
  fecha_emision: new Date('2026-10-01T10:00:00Z'),
  fecha_estimada_arribo: '2026-10-15',
  notas: null,
  costo_total: 125.5,
  unidades_totales: 10,
  usuario_id: null,
  motivo_cancelacion: null,
  recibido_en: null,
  creado_en: new Date('2026-10-01T10:00:00Z'),
  actualizado_en: new Date('2026-10-01T10:00:00Z'),
};

function filtros(overrides: Partial<ListarReposicionesQuery> = {}): ListarReposicionesQuery {
  return { page: 1, limit: 20, ...overrides } as ListarReposicionesQuery;
}

/** Cliente transaccional configurable para `recibir`. */
function simularCliente(opciones: { estado?: string | null; stockRowCount?: number } = {}): void {
  const { estado = 'PENDIENTE', stockRowCount = 1 } = opciones;
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FOR UPDATE')) {
      return estado === null ? { rows: [], rowCount: 0 } : { rows: [{ estado }], rowCount: 1 };
    }
    if (sql.includes('FROM detalle_reposicion') && sql.includes('ORDER BY producto_id')) {
      return { rows: [{ producto_id: SKU_A, cantidad_pedida: 3 }, { producto_id: SKU_B, cantidad_pedida: 2 }], rowCount: 2 };
    }
    if (sql.includes('UPDATE inventario')) {
      return { rows: [{ stock_actual: 42 }], rowCount: stockRowCount };
    }
    return { rows: [], rowCount: 0 };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  poolMock.connect.mockResolvedValue(client);
  poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
  simularCliente();
});

describe('reposicionRepository.listar (HU036 CA07)', () => {
  it('paginа y devuelve el total del conteo', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [ordenRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ total: '7' }], rowCount: 1 });

    const result = await reposicionRepository.listar(filtros({ page: 2, limit: 5 }));

    expect(result.total).toBe(7);
    expect(result.items).toEqual([ordenRow]);
    const [sql, valores] = poolMock.query.mock.calls[0];
    expect(sql).toContain('INNER JOIN proveedores');
    expect(sql).toContain('LIMIT $1 OFFSET $2');
    expect(valores).toEqual([5, 5]); // limit=5, offset=(2-1)*5
  });

  it('aplica los filtros de estado y proveedor al WHERE y al conteo', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 });

    await reposicionRepository.listar(filtros({ estado: 'RECIBIDO', proveedor_id: SKU_A }));

    const [sqlPagina, valoresPagina] = poolMock.query.mock.calls[0];
    const [sqlConteo, valoresConteo] = poolMock.query.mock.calls[1];
    expect(sqlPagina).toContain('o.estado = $1::estado_reposicion_enum');
    expect(sqlPagina).toContain('o.proveedor_id = $2');
    expect(valoresPagina).toEqual(['RECIBIDO', SKU_A, 20, 0]);
    expect(sqlConteo).toContain('COUNT(*)');
    expect(valoresConteo).toEqual(['RECIBIDO', SKU_A]);
  });
});

describe('reposicionRepository — lecturas', () => {
  it('obtiene la orden por id y devuelve null si no existe', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [ordenRow], rowCount: 1 });
    expect(await reposicionRepository.obtenerPorId(ORDEN_ID)).toEqual(ordenRow);

    poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await reposicionRepository.obtenerPorId(ORDEN_ID)).toBeNull();
  });

  it('lista el detalle con el SKU y el nombre del producto', async () => {
    poolMock.query.mockResolvedValue({ rows: [{ id: 'd1', sku: 'ZAP-NEG-42' }], rowCount: 1 });
    const lineas = await reposicionRepository.listarDetalle(ORDEN_ID);
    expect(lineas).toHaveLength(1);
    expect(poolMock.query.mock.calls[0][1]).toEqual([ORDEN_ID]);
  });

  it('detecta los productos inexistentes', async () => {
    poolMock.query.mockResolvedValue({ rows: [{ id: SKU_A }], rowCount: 1 });
    const faltantes = await reposicionRepository.listarProductosFaltantes([SKU_A, SKU_B]);
    expect(faltantes).toEqual([SKU_B]);
  });
});

describe('reposicionRepository.crear (HU036 CA02)', () => {
  it('inserta cabecera y detalle dentro de la transacción', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO ordenes_reposicion')) {
        return { rows: [{ id: ORDEN_ID }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    const id = await reposicionRepository.crear({
      proveedor_id: ordenRow.proveedor_id,
      fecha_estimada_arribo: '2026-10-15',
      notas: 'reponer',
      costo_total: 125.5,
      unidades_totales: 10,
      usuario_id: null,
      detalles: [
        { producto_id: SKU_A, costo_unitario: 10, cantidad_pedida: 3 },
        { producto_id: SKU_B, costo_unitario: 47.75, cantidad_pedida: 2 },
      ],
    });

    expect(id).toBe(ORDEN_ID);
    expect(clientQuery.mock.calls[0][0]).toBe('BEGIN');
    const insertCabecera = clientQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO ordenes_reposicion'));
    expect(insertCabecera?.[1]).toEqual([ordenRow.proveedor_id, '2026-10-15', 'reponer', 125.5, 10, null]);
    const insertsDetalle = clientQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO detalle_reposicion'));
    expect(insertsDetalle).toHaveLength(2);
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(clientRelease).toHaveBeenCalledTimes(1);
  });

  it('revierte y propaga el error si falla una inserción', async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO detalle_reposicion')) throw new Error('fallo detalle');
      return { rows: [{ id: ORDEN_ID }], rowCount: 1 };
    });

    await expect(
      reposicionRepository.crear({
        proveedor_id: ordenRow.proveedor_id,
        fecha_estimada_arribo: null,
        notas: null,
        costo_total: 0,
        unidades_totales: 1,
        usuario_id: null,
        detalles: [{ producto_id: SKU_A, costo_unitario: 1, cantidad_pedida: 1 }],
      })
    ).rejects.toThrow('fallo detalle');

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientQuery).not.toHaveBeenCalledWith('COMMIT');
  });
});

describe('reposicionRepository.recibir (HU036 CA05/CA06)', () => {
  const usuario = '44444444-4444-4444-4444-444444444444';

  it('suma el stock de cada línea y registra el movimiento de kardex', async () => {
    const resumen = await reposicionRepository.recibir(ORDEN_ID, usuario);

    expect(resumen).toEqual({ lineas_actualizadas: 2, unidades_ingresadas: 5 });
    expect(clientQuery.mock.calls[0][0]).toBe('BEGIN');
    expect(clientQuery.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(clientQuery.mock.calls[1][1]).toEqual([ORDEN_ID]);

    const updatesStock = clientQuery.mock.calls.filter(([sql]) => sql.includes('UPDATE inventario'));
    expect(updatesStock).toHaveLength(2);
    expect(updatesStock[0][1]).toEqual([SKU_A, 3]);

    const movimientos = clientQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO movimientos_inventario'));
    expect(movimientos).toHaveLength(2);
    expect(movimientos[0][1]).toEqual([SKU_A, 3, 42, ORDEN_ID, usuario]);

    const cambioEstado = clientQuery.mock.calls.find(([sql]) => sql.includes("estado = 'RECIBIDO'"));
    expect(cambioEstado?.[1]).toEqual([ORDEN_ID]);

    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(clientRelease).toHaveBeenCalledTimes(1);
  });

  it('lanza OrdenNoEncontradaError y revierte si la orden no existe', async () => {
    simularCliente({ estado: null });
    await expect(reposicionRepository.recibir(ORDEN_ID, null)).rejects.toBeInstanceOf(OrdenNoEncontradaError);
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientQuery).not.toHaveBeenCalledWith('COMMIT');
  });

  it('lanza OrdenNoPendienteError si ya está RECIBIDO o CANCELADO', async () => {
    simularCliente({ estado: 'RECIBIDO' });
    await expect(reposicionRepository.recibir(ORDEN_ID, null)).rejects.toBeInstanceOf(OrdenNoPendienteError);
    expect(clientQuery).not.toHaveBeenCalledWith('COMMIT');
  });

  it('lanza ProductoSinInventarioError si el SKU no tiene fila de inventario', async () => {
    simularCliente({ stockRowCount: 0 });
    await expect(reposicionRepository.recibir(ORDEN_ID, null)).rejects.toBeInstanceOf(ProductoSinInventarioError);
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('reposicionRepository.cancelar (HU036 CA09)', () => {
  it('devuelve true si la orden estaba PENDIENTE', async () => {
    poolMock.query.mockResolvedValue({ rows: [], rowCount: 1 });
    expect(await reposicionRepository.cancelar(ORDEN_ID, 'sin stock')).toBe(true);
    expect(poolMock.query.mock.calls[0][1]).toEqual([ORDEN_ID, 'sin stock']);
  });

  it('devuelve false si no había fila que actualizar', async () => {
    poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
    expect(await reposicionRepository.cancelar(ORDEN_ID, null)).toBe(false);
  });
});
