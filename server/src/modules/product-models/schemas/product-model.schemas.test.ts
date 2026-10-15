import { describe, it, expect } from 'vitest';
import {
  MAX_VARIANTES_DELTA,
  actualizarModeloSchema,
  actualizarVarianteSchema,
  crearModeloSchema,
  deltaVariantesSchema,
  modeloIdParamSchema,
  nuevaVarianteSchema,
  skuIdParamSchema,
} from './product-model.schemas';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('crearModeloSchema (HU035)', () => {
  it('aplica trim y acepta el alta mínima', () => {
    const parsed = crearModeloSchema.parse({ categoria_id: 1, nombre: '  Runner Pro  ' });
    expect(parsed.nombre).toBe('Runner Pro');
    expect(parsed.atributos_variantes).toBeUndefined();
  });

  it('rechaza categoría no positiva y nombre demasiado corto', () => {
    expect(crearModeloSchema.safeParse({ categoria_id: 0, nombre: 'X' }).success).toBe(false);
    expect(crearModeloSchema.safeParse({ categoria_id: 1, nombre: 'A' }).success).toBe(false);
  });

  it('limita la cantidad de ejes de variante', () => {
    const ejes = Array.from({ length: 13 }, (_, i) => `EJE_${i}`);
    expect(crearModeloSchema.safeParse({ categoria_id: 1, nombre: 'Ok', atributos_variantes: ejes }).success).toBe(
      false
    );
  });
});

describe('actualizarModeloSchema (HU035)', () => {
  it('exige al menos un campo', () => {
    expect(actualizarModeloSchema.safeParse({}).success).toBe(false);
  });

  it('acepta un cambio parcial', () => {
    const parsed = actualizarModeloSchema.parse({ activo: false });
    expect(parsed.activo).toBe(false);
  });
});

describe('nuevaVarianteSchema (HU035)', () => {
  const base = { atributos: { COLOR: 'Negro' }, precio_regular: 89.99, stock_actual: 10 };

  it('acepta una variante válida', () => {
    expect(nuevaVarianteSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza precio no positivo y stock negativo', () => {
    expect(nuevaVarianteSchema.safeParse({ ...base, precio_regular: 0 }).success).toBe(false);
    expect(nuevaVarianteSchema.safeParse({ ...base, stock_actual: -1 }).success).toBe(false);
  });

  it('exige que la oferta sea menor que el precio regular', () => {
    expect(nuevaVarianteSchema.safeParse({ ...base, precio_oferta: 100 }).success).toBe(false);
    expect(nuevaVarianteSchema.safeParse({ ...base, precio_oferta: 50 }).success).toBe(true);
  });

  it('normaliza la oferta vacía a null', () => {
    const parsed = nuevaVarianteSchema.parse({ ...base, precio_oferta: '' });
    expect(parsed.precio_oferta).toBeNull();
  });
});

describe('actualizarVarianteSchema (HU035)', () => {
  it('exige un sku_id con formato UUID', () => {
    expect(actualizarVarianteSchema.safeParse({ sku_id: 'no-uuid' }).success).toBe(false);
  });

  it('exige al menos un campo mutable', () => {
    expect(actualizarVarianteSchema.safeParse({ sku_id: UUID }).success).toBe(false);
    expect(actualizarVarianteSchema.safeParse({ sku_id: UUID, stock_actual: 3 }).success).toBe(true);
  });
});

describe('deltaVariantesSchema (HU035 CA08)', () => {
  it('rellena los arreglos ausentes con []', () => {
    const parsed = deltaVariantesSchema.parse({});
    expect(parsed).toEqual({ nuevas_variantes: [], actualizar_variantes: [], eliminar_variantes: [] });
  });

  it('rechaza más variantes nuevas que el máximo permitido', () => {
    const nuevas = Array.from({ length: MAX_VARIANTES_DELTA + 1 }, () => ({
      atributos: { COLOR: 'Negro' },
      precio_regular: 10,
      stock_actual: 1,
    }));
    expect(deltaVariantesSchema.safeParse({ nuevas_variantes: nuevas }).success).toBe(false);
  });

  it('rechaza ids de eliminación que no son UUID', () => {
    expect(deltaVariantesSchema.safeParse({ eliminar_variantes: ['x'] }).success).toBe(false);
  });
});

describe('parámetros de ruta', () => {
  it('valida el id del modelo y el del SKU', () => {
    expect(modeloIdParamSchema.safeParse({ id: UUID }).success).toBe(true);
    expect(modeloIdParamSchema.safeParse({ id: 'nope' }).success).toBe(false);
    expect(skuIdParamSchema.safeParse({ skuId: UUID }).success).toBe(true);
    expect(skuIdParamSchema.safeParse({ skuId: 'nope' }).success).toBe(false);
  });
});
