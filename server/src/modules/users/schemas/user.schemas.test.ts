import { describe, it, expect } from 'vitest';
import {
  actualizarPasswordSchema,
  actualizarUsuarioSchema,
  buscarDocumentoQuerySchema,
  crearUsuarioSchema,
  listarUsuariosQuerySchema,
} from './user.schemas';

const base = {
  id_rol: 2,
  tipo_documento: 'DNI' as const,
  numero_documento: '12345678',
  nombres: 'Ana',
  apellidos: 'Pérez',
  email: 'ana@verodata.com',
  password: 'Passw0rd',
};

describe('crearUsuarioSchema (HU002)', () => {
  it('acepta datos válidos', () => {
    expect(crearUsuarioSchema.safeParse(base).success).toBe(true);
  });
  it('rechaza documento demasiado corto', () => {
    expect(crearUsuarioSchema.safeParse({ ...base, numero_documento: '123' }).success).toBe(false);
  });

  it('rechaza email inválido', () => {
    expect(crearUsuarioSchema.safeParse({ ...base, email: 'no-es-email' }).success).toBe(false);
  });

  it('rechaza contraseña sin mayúscula ni número', () => {
    expect(crearUsuarioSchema.safeParse({ ...base, password: 'password' }).success).toBe(false);
  });

  it('rechaza id_rol ausente', () => {
    const { id_rol: _idRol, ...rest } = base;
    expect(crearUsuarioSchema.safeParse(rest).success).toBe(false);
  });
});

describe('actualizarUsuarioSchema (HU005)', () => {
  it('rechaza body vacío', () => {
    expect(actualizarUsuarioSchema.safeParse({}).success).toBe(false);
  });

  it('acepta un único campo a actualizar', () => {
    expect(actualizarUsuarioSchema.safeParse({ nombres: 'Ana María' }).success).toBe(true);
  });

  it('no admite cambio de contraseña ni rol (campos no declarados)', () => {
    const result = actualizarUsuarioSchema.safeParse({ password: 'Hackeada1', id_rol: 1 });
    expect(result.success).toBe(false);
  });
});

describe('listarUsuariosQuerySchema (HU003)', () => {
  it('coacciona bloqueado "true" a boolean', () => {
    const result = listarUsuariosQuerySchema.safeParse({ bloqueado: 'true' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bloqueado).toBe(true);
  });

  it('rechaza un rol no permitido', () => {
    expect(listarUsuariosQuerySchema.safeParse({ rol: 'HACKER' }).success).toBe(false);
  });
});

describe('buscarDocumentoQuerySchema (HU004)', () => {
  it('rechaza documento demasiado corto', () => {
    expect(buscarDocumentoQuerySchema.safeParse({ documento: '12' }).success).toBe(false);
  });

  it('acepta un documento válido', () => {
    expect(buscarDocumentoQuerySchema.safeParse({ documento: '12345678' }).success).toBe(true);
  });
});

describe('actualizarPasswordSchema (backoffice)', () => {
  it('acepta una contraseña que cumple la política', () => {
    expect(actualizarPasswordSchema.safeParse({ password: 'Passw0rd' }).success).toBe(true);
  });

  it('rechaza menos de 8 caracteres', () => {
    expect(actualizarPasswordSchema.safeParse({ password: 'Pass1' }).success).toBe(false);
  });

  it('rechaza contraseña sin mayúscula ni número', () => {
    expect(actualizarPasswordSchema.safeParse({ password: 'password' }).success).toBe(false);
  });

  it('rechaza body vacío', () => {
    expect(actualizarPasswordSchema.safeParse({}).success).toBe(false);
  });
});
