import { describe, it, expect } from 'vitest';
import {
  MAX_DETALLES_REPOSICION,
  cancelarReposicionSchema,
  crearReposicionSchema,
  listarReposicionesQuerySchema,
  reposicionIdParamSchema,
} from './reposicion.schemas';

const UUID_PROVEEDOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const UUID_PRODUCTO = '11111111-1111-1111-1111-111111111111';
const UUID_PRODUCTO_2 = '22222222-2222-2222-2222-222222222222';

function base(overrides: Record<string, unknown> = {}): unknown {
  return {
    proveedor_id: UUID_PROVEEDOR,
    detalles: [{ producto_id: UUID_PRODUCTO, costo_unitario: 12.5, cantidad_pedida: 4 }],
    ...overrides,
  };
}

describe('crearReposicionSchema (HU036 CA02)', () => {
  it('acepta una orden válida y normaliza la fecha opcional', () => {
    const parsed = crearReposicionSchema.parse(base({ fecha_estimada_arribo: '2026-11-05' }));
    expect(parsed.proveedor_id).toBe(UUID_PROVEEDOR);
    expect(parsed.detalles).toHaveLength(1);
    expect(parsed.fecha_estimada_arribo).toBe('2026-11-05');
  });

  it('rechaza proveedor que no es UUID', () => {
    expect(crearReposicionSchema.safeParse(base({ proveedor_id: 'nope' })).success).toBe(false);
  });

  it('exige al menos un detalle', () => {
    expect(crearReposicionSchema.safeParse(base({ detalles: [] })).success).toBe(false);
  });

  it('rechaza cantidad 0 o negativa y costo negativo', () => {
    expect(
      crearReposicionSchema.safeParse(
        base({ detalles: [{ producto_id: UUID_PRODUCTO, costo_unitario: 10, cantidad_pedida: 0 }] })
      ).success
    ).toBe(false);
    expect(
      crearReposicionSchema.safeParse(
        base({ detalles: [{ producto_id: UUID_PRODUCTO, costo_unitario: -1, cantidad_pedida: 2 }] })
      ).success
    ).toBe(false);
  });

  it('rechaza el mismo producto repetido en la orden', () => {
    const repetido = base({
      detalles: [
        { producto_id: UUID_PRODUCTO, costo_unitario: 10, cantidad_pedida: 1 },
        { producto_id: UUID_PRODUCTO, costo_unitario: 11, cantidad_pedida: 2 },
      ],
    });
    expect(crearReposicionSchema.safeParse(repetido).success).toBe(false);
  });

  it('acepta productos distintos', () => {
    const ok = base({
      detalles: [
        { producto_id: UUID_PRODUCTO, costo_unitario: 10, cantidad_pedida: 1 },
        { producto_id: UUID_PRODUCTO_2, costo_unitario: 11, cantidad_pedida: 2 },
      ],
    });
    expect(crearReposicionSchema.safeParse(ok).success).toBe(true);
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(crearReposicionSchema.safeParse(base({ fecha_estimada_arribo: '05/11/2026' })).success).toBe(false);
  });

  it('rechaza más líneas que el máximo permitido', () => {
    const detalles = Array.from({ length: MAX_DETALLES_REPOSICION + 1 }, (_, i) => ({
      producto_id: `${String(i).padStart(8, '0')}-1111-1111-1111-111111111111`,
      costo_unitario: 1,
      cantidad_pedida: 1,
    }));
    expect(crearReposicionSchema.safeParse(base({ detalles })).success).toBe(false);
  });
});

describe('listarReposicionesQuerySchema (HU036 CA07)', () => {
  it('aplica page=1 y limit=20 por defecto y coerciona strings', () => {
    const parsed = listarReposicionesQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);

    const conQuery = listarReposicionesQuerySchema.parse({ page: '3', limit: '50' });
    expect(conQuery.page).toBe(3);
    expect(conQuery.limit).toBe(50);
  });

  it('rechaza estados fuera del enum y límites inválidos', () => {
    expect(listarReposicionesQuerySchema.safeParse({ estado: 'ENTREGADO' }).success).toBe(false);
    expect(listarReposicionesQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(listarReposicionesQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('acepta filtro por estado y proveedor', () => {
    const parsed = listarReposicionesQuerySchema.parse({ estado: 'PENDIENTE', proveedor_id: UUID_PROVEEDOR });
    expect(parsed.estado).toBe('PENDIENTE');
    expect(parsed.proveedor_id).toBe(UUID_PROVEEDOR);
  });
});

describe('cancelarReposicionSchema y reposicionIdParamSchema', () => {
  it('el motivo es opcional', () => {
    expect(cancelarReposicionSchema.safeParse({}).success).toBe(true);
    expect(cancelarReposicionSchema.parse({ motivo: '  sin stock  ' }).motivo).toBe('sin stock');
  });

  it('valida el UUID de la orden', () => {
    expect(reposicionIdParamSchema.safeParse({ id: UUID_PROVEEDOR }).success).toBe(true);
    expect(reposicionIdParamSchema.safeParse({ id: 'nope' }).success).toBe(false);
  });
});
