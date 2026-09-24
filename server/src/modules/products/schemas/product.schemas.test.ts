import { describe, it, expect } from 'vitest';
import {
  actualizarProductoSchema,
  crearProductoSchema,
  listarProductosQuerySchema,
} from './product.schemas';

const base = {
  categoria_id: 1,
  sku: 'SKU-001',
  nombre: 'Zapatilla running',
  descripcion: 'Zapatilla para correr',
  precio_regular: 199.9,
};

describe('crearProductoSchema (HU007)', () => {
  it('acepta datos válidos', () => {
    expect(crearProductoSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza precio regular no positivo', () => {
    expect(crearProductoSchema.safeParse({ ...base, precio_regular: 0 }).success).toBe(false);
  });

  it('rechaza descripción vacía (es obligatoria)', () => {
    expect(crearProductoSchema.safeParse({ ...base, descripcion: '' }).success).toBe(false);
  });

  it('rechaza precio de oferta mayor o igual al regular', () => {
    expect(
      crearProductoSchema.safeParse({ ...base, precio_oferta: 250 }).success
    ).toBe(false);
  });

  it('acepta precio de oferta menor al regular', () => {
    expect(crearProductoSchema.safeParse({ ...base, precio_oferta: 149.9 }).success).toBe(true);
  });

  it('rechaza SKU demasiado corto', () => {
    expect(crearProductoSchema.safeParse({ ...base, sku: 'ab' }).success).toBe(false);
  });
});

describe('listarProductosQuerySchema (HU007)', () => {
  it('coacciona categoria_id y activo', () => {
    const result = listarProductosQuerySchema.safeParse({ categoria_id: '3', activo: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoria_id).toBe(3);
      expect(result.data.activo).toBe(true);
    }
  });
});

describe('actualizarProductoSchema (HU008)', () => {
  it('rechaza body vacío', () => {
    expect(actualizarProductoSchema.safeParse({}).success).toBe(false);
  });

  it('acepta actualizar solo el precio regular', () => {
    expect(actualizarProductoSchema.safeParse({ precio_regular: 120 }).success).toBe(true);
  });

  it('acepta precio_oferta null para quitar la oferta', () => {
    const result = actualizarProductoSchema.safeParse({ precio_oferta: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.precio_oferta).toBeNull();
  });

  it('rechaza precio regular negativo', () => {
    expect(actualizarProductoSchema.safeParse({ precio_regular: -5 }).success).toBe(false);
  });
});
