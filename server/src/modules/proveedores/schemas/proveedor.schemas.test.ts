import { describe, it, expect } from 'vitest';
import {
  crearProveedorSchema,
  listarProveedoresQuerySchema,
  proveedorIdParamSchema,
} from './proveedor.schemas';

describe('crearProveedorSchema (HU036)', () => {
  it('exige la razón social con mínimo 2 caracteres', () => {
    expect(crearProveedorSchema.safeParse({ nombre_empresa: 'A' }).success).toBe(false);
    expect(crearProveedorSchema.parse({ nombre_empresa: '  Acme SAC  ' }).nombre_empresa).toBe('Acme SAC');
  });

  it('acepta el alta mínima', () => {
    expect(crearProveedorSchema.safeParse({ nombre_empresa: 'Acme SAC' }).success).toBe(true);
  });

  it('valida el email cuando viene', () => {
    expect(crearProveedorSchema.safeParse({ nombre_empresa: 'Acme', email: 'no-es-email' }).success).toBe(false);
    expect(crearProveedorSchema.safeParse({ nombre_empresa: 'Acme', email: 'ventas@acme.pe' }).success).toBe(true);
  });
});

describe('listarProveedoresQuerySchema y proveedorIdParamSchema', () => {
  it('el buscador es opcional', () => {
    expect(listarProveedoresQuerySchema.safeParse({}).success).toBe(true);
    expect(listarProveedoresQuerySchema.parse({ search: ' andina ' }).search).toBe('andina');
  });

  it('valida el UUID del proveedor', () => {
    expect(proveedorIdParamSchema.safeParse({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }).success).toBe(true);
    expect(proveedorIdParamSchema.safeParse({ id: 'x' }).success).toBe(false);
  });
});
