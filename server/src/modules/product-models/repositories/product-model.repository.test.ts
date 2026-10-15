import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/db', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}));

import pool from '../../../config/db';
import {
  productModelRepository,
  VarianteAjenaError,
  type ActualizarVariantePreparada,
  type DeltaPreparado,
  type NuevaVariantePreparada,
  type ProductoModeloRow,
} from './product-model.repository';

type Mock = ReturnType<typeof vi.fn>;

const poolMock = pool as unknown as { query: Mock; connect: Mock };

const MODELO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SKU_ID = '11111111-1111-1111-1111-111111111111';
const SKU_NUEVO = '22222222-2222-2222-2222-222222222222';

const clientQuery = vi.fn();
const clientRelease = vi.fn();
const client = { query: clientQuery, release: clientRelease };

const modelo: ProductoModeloRow = {
  id: MODELO_ID,
  categoria_id: 1,
  categoria_nombre: 'Zapatillas',
  nombre: 'Runner Pro',
  marca: 'Nike',
  modelo_codigo: 'RNP',
  descripcion: null,
  atributos_variantes: ['COLOR', 'SIZE'],
  activo: true,
  destacado: false,
  destacado_orden: null,
  creado_en: new Date('2026-01-01T00:00:00Z'),
  actualizado_en: new Date('2026-01-01T00:00:00Z'),
};

const nuevaVariante: NuevaVariantePreparada = {
  sku: 'ZAP-NEG-42',
  codigo_barras: '7801234567890',
  atributos: { COLOR: 'Negro', SIZE: '42' },
  precio_regular: 89.99,
  precio_oferta: null,
  stock_actual: 10,
  stock_minimo: 5,
  categoria_id: 1,
  nombre: 'Runner Pro',
  descripcion: null,
};

const varianteActualizable: ActualizarVariantePreparada = {
  sku_id: SKU_ID,
  precio_regular: 95,
  reemplazaOferta: true,
  precio_oferta: null,
  stock_actual: 4,
};

/** Implementación del cliente transaccional que responde según la sentencia. */
function simularCliente(opciones: { updateRowCount?: number; eliminarRowCount?: number } = {}): void {
  const { updateRowCount = 1, eliminarRowCount = 0 } = opciones;
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FOR UPDATE')) return { rows: [], rowCount: 0 };
    if (sql.includes('INSERT INTO productos') && sql.includes('RETURNING id')) {
      return { rows: [{ id: SKU_NUEVO }], rowCount: 1 };
    }
    if (sql.includes('WHERE id = $6 AND modelo_id = $7')) {
      return { rows: [], rowCount: updateRowCount };
    }
    if (sql.includes('id = ANY($2::uuid[])')) {
      return { rows: [], rowCount: eliminarRowCount };
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

describe('productModelRepository — lecturas', () => {
  it('lista los modelos ordenados por creación', async () => {
    poolMock.query.mockResolvedValue({ rows: [modelo], rowCount: 1 });
    const filas = await productModelRepository.listar();
    expect(filas).toEqual([modelo]);
    expect(poolMock.query.mock.calls[0][0]).toContain('ORDER BY m.creado_en DESC');
  });

  it('obtiene un modelo por id y devuelve null si no existe', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [modelo], rowCount: 1 });
    expect(await productModelRepository.obtenerPorId(MODELO_ID)).toEqual(modelo);

    poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await productModelRepository.obtenerPorId(MODELO_ID)).toBeNull();
  });

  it('lista las variantes del modelo con su stock', async () => {
    poolMock.query.mockResolvedValue({ rows: [{ id: SKU_ID }], rowCount: 1 });
    const filas = await productModelRepository.listarVariantes(MODELO_ID);
    expect(filas).toHaveLength(1);
    expect(poolMock.query.mock.calls[0][1]).toEqual([MODELO_ID]);
  });

  it('resuelve el modelo de un SKU (undefined si no existe, null si no tiene modelo)', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ modelo_id: MODELO_ID }], rowCount: 1 });
    expect(await productModelRepository.obtenerModeloIdPorSku(SKU_ID)).toBe(MODELO_ID);

    poolMock.query.mockResolvedValueOnce({ rows: [{ modelo_id: null }], rowCount: 1 });
    expect(await productModelRepository.obtenerModeloIdPorSku(SKU_ID)).toBeNull();

    poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await productModelRepository.obtenerModeloIdPorSku(SKU_ID)).toBeUndefined();
  });

  it('detecta si el SKU ya existe y excluye el id indicado', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });
    expect(await productModelRepository.existeSku('ZAP-NEG-42')).toBe(true);

    poolMock.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
    expect(await productModelRepository.existeSku('ZAP-NEG-42', SKU_ID)).toBe(false);
    expect(poolMock.query.mock.calls[1][1]).toEqual(['ZAP-NEG-42', SKU_ID]);
  });
});

describe('productModelRepository — escrituras', () => {
  it('crea el modelo y devuelve el id generado', async () => {
    poolMock.query.mockResolvedValue({ rows: [{ id: MODELO_ID }], rowCount: 1 });
    const id = await productModelRepository.crear({
      categoria_id: 1,
      nombre: 'Runner Pro',
      marca: 'Nike',
      modelo_codigo: 'RNP',
      descripcion: null,
      atributos_variantes: ['COLOR'],
    });
    expect(id).toBe(MODELO_ID);
    expect(poolMock.query.mock.calls[0][1]).toEqual([1, 'Runner Pro', 'Nike', 'RNP', null, ['COLOR']]);
  });

  it('no ejecuta UPDATE si no hay campos por actualizar', async () => {
    await productModelRepository.actualizar(MODELO_ID, {});
    expect(poolMock.query).not.toHaveBeenCalled();
  });

  it('construye el SET dinámico con el cast de text[] y el id al final', async () => {
    await productModelRepository.actualizar(MODELO_ID, {
      nombre: 'Runner Pro 2',
      atributos_variantes: ['COLOR', 'SIZE'],
    });
    const [sql, values] = poolMock.query.mock.calls[0];
    expect(sql).toContain('nombre = $1');
    expect(sql).toContain('atributos_variantes = $2::text[]');
    expect(sql).toContain('actualizado_en = NOW()');
    expect(sql).toContain('WHERE id = $3');
    expect(values).toEqual(['Runner Pro 2', ['COLOR', 'SIZE'], MODELO_ID]);
  });
});

describe('productModelRepository.aplicarDelta (HU035 CA08)', () => {
  function delta(overrides: Partial<DeltaPreparado> = {}): DeltaPreparado {
    return { nuevas: [], actualizar: [], eliminar: [], ...overrides };
  }

  it('inserta la variante nueva y su inventario dentro de la transacción', async () => {
    const resumen = await productModelRepository.aplicarDelta(MODELO_ID, delta({ nuevas: [nuevaVariante] }));

    expect(resumen).toEqual({ creadas: 1, actualizadas: 0, desactivadas: 0 });
    expect(clientQuery.mock.calls[0][0]).toBe('BEGIN');
    expect(clientQuery.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(clientQuery.mock.calls[1][1]).toEqual([MODELO_ID]);

    const insertProducto = clientQuery.mock.calls.find(([sql]) => sql.includes('RETURNING id'));
    expect(insertProducto?.[1][8]).toBe(JSON.stringify({ COLOR: 'Negro', SIZE: '42' }));

    const insertInventario = clientQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO inventario'));
    expect(insertInventario?.[1]).toEqual([SKU_NUEVO, 10, 5]);

    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(clientRelease).toHaveBeenCalledTimes(1);
  });

  it('actualiza la variante existente y hace upsert de su stock', async () => {
    const resumen = await productModelRepository.aplicarDelta(
      MODELO_ID,
      delta({ actualizar: [varianteActualizable] })
    );
    expect(resumen).toEqual({ creadas: 0, actualizadas: 1, desactivadas: 0 });
    const upsert = clientQuery.mock.calls.find(([sql]) => sql.includes('ON CONFLICT (producto_id)'));
    expect(upsert?.[1]).toEqual([SKU_ID, 4, undefined]);
  });

  it('lanza VarianteAjenaError y revierte si la variante no pertenece al modelo', async () => {
    simularCliente({ updateRowCount: 0 });
    await expect(
      productModelRepository.aplicarDelta(MODELO_ID, delta({ actualizar: [varianteActualizable] }))
    ).rejects.toBeInstanceOf(VarianteAjenaError);

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientQuery).not.toHaveBeenCalledWith('COMMIT');
    expect(clientRelease).toHaveBeenCalledTimes(1);
  });

  it('desactiva (borrado lógico) las variantes indicadas y cuenta las filas', async () => {
    simularCliente({ eliminarRowCount: 2 });
    const resumen = await productModelRepository.aplicarDelta(MODELO_ID, delta({ eliminar: [SKU_ID] }));
    expect(resumen.desactivadas).toBe(2);
    const baja = clientQuery.mock.calls.find(([sql]) => sql.includes('id = ANY($2::uuid[])'));
    expect(baja?.[1]).toEqual([MODELO_ID, [SKU_ID]]);
  });

  it('no emite el UPDATE de baja si no hay variantes a eliminar', async () => {
    const resumen = await productModelRepository.aplicarDelta(MODELO_ID, delta());
    expect(resumen.desactivadas).toBe(0);
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('id = ANY($2::uuid[])'))).toBe(false);
  });

  it('revierte y propaga el error si falla un INSERT', async () => {
    const error = new Error('fallo de inserción');
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING id')) throw error;
      return { rows: [], rowCount: 0 };
    });

    await expect(
      productModelRepository.aplicarDelta(MODELO_ID, delta({ nuevas: [nuevaVariante] }))
    ).rejects.toThrow('fallo de inserción');
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientRelease).toHaveBeenCalledTimes(1);
  });
});
