import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    listar: vi.fn(),
    listarRoles: vi.fn(),
    obtenerPorId: vi.fn(),
    obtenerPorDocumento: vi.fn(),
    existeRol: vi.fn(),
    existeEmail: vi.fn(),
    existeEmailOtro: vi.fn(),
    existeDocumento: vi.fn(),
    existeDocumentoOtro: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    actualizarBloqueo: vi.fn(),
    actualizarPassword: vi.fn(),
  },
}));

import { userService } from './user.service';
import { userRepository } from '../repositories/user.repository';
import type { UsuarioListadoRow } from '../repositories/user.repository';

const repo = userRepository as unknown as {
  obtenerPorId: ReturnType<typeof vi.fn>;
  existeRol: ReturnType<typeof vi.fn>;
  existeEmail: ReturnType<typeof vi.fn>;
  existeEmailOtro: ReturnType<typeof vi.fn>;
  existeDocumento: ReturnType<typeof vi.fn>;
  existeDocumentoOtro: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
  actualizarBloqueo: ReturnType<typeof vi.fn>;
  actualizarPassword: ReturnType<typeof vi.fn>;
};

const row: UsuarioListadoRow = {
  id: 'uuid-1',
  email: 'admin@verodata.com',
  rol: 'ADMIN',
  bloqueado: false,
  intentos_fallidos: 0,
  tipo_documento: 'DNI',
  numero_documento: '12345678',
  nombres: 'Ana',
  apellidos: 'Pérez',
  telefono: null,
  creado_en: new Date(),
};

const crearInput = {
  id_rol: 2,
  tipo_documento: 'DNI' as const,
  numero_documento: '12345678',
  nombres: 'Ana',
  apellidos: 'Pérez',
  email: 'ana@verodata.com',
  password: 'Passw0rd',
};

describe('userService.crear (HU002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeEmail.mockResolvedValue(false);
    repo.existeDocumento.mockResolvedValue(false);
    repo.existeRol.mockResolvedValue(true);
  });

  it('rechaza email duplicado con EMAIL_ALREADY_EXISTS', async () => {
    repo.existeEmail.mockResolvedValue(true);
    const result = await userService.crear(crearInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('rechaza documento duplicado con DOCUMENT_ALREADY_EXISTS', async () => {
    repo.existeDocumento.mockResolvedValue(true);
    const result = await userService.crear(crearInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('DOCUMENT_ALREADY_EXISTS');
  });

  it('rechaza rol inexistente con ROLE_NOT_FOUND', async () => {
    repo.existeRol.mockResolvedValue(false);
    const result = await userService.crear(crearInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ROLE_NOT_FOUND');
  });

  it('registra el colaborador y devuelve id + email', async () => {
    repo.crear.mockResolvedValue('new-uuid');
    const result = await userService.crear(crearInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ id: 'new-uuid', email: crearInput.email });
    expect(repo.crear).toHaveBeenCalledOnce();
  });
});

describe('userService.obtener / actualizar (HU004/HU005)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('obtener devuelve RESOURCE_NOT_FOUND si no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await userService.obtener('uuid-x');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('actualizar devuelve RESOURCE_NOT_FOUND si no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await userService.actualizar('uuid-x', { nombres: 'Nuevo' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('actualizar rechaza email que pertenece a otra cuenta', async () => {
    repo.obtenerPorId.mockResolvedValue(row);
    repo.existeEmailOtro.mockResolvedValue(true);
    const result = await userService.actualizar('uuid-1', { email: 'otro@verodata.com' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('actualizar persiste y devuelve el colaborador actualizado', async () => {
    repo.obtenerPorId.mockResolvedValueOnce(row).mockResolvedValueOnce({ ...row, nombres: 'Ana María' });
    repo.existeEmailOtro.mockResolvedValue(false);
    repo.actualizar.mockResolvedValue(undefined);

    const result = await userService.actualizar('uuid-1', { nombres: 'Ana María' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.nombres).toBe('Ana María');
    expect(repo.actualizar).toHaveBeenCalledOnce();
  });
});

describe('userService.cambiarPassword (backoffice)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cambia la contraseña de un colaborador no super admin', async () => {
    repo.obtenerPorId.mockResolvedValue(row);
    repo.actualizarPassword.mockResolvedValue(undefined);

    const result = await userService.cambiarPassword('uuid-1', { password: 'Passw0rd' });

    expect(result.success).toBe(true);
    expect(repo.actualizarPassword).toHaveBeenCalledOnce();

    // El hash nunca se guarda en claro: bcrypt produce un prefijo $2…
    const hash = repo.actualizarPassword.mock.calls[0][1] as string;
    expect(hash).not.toBe('Passw0rd');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('protege la cuenta SUPER_ADMIN', async () => {
    repo.obtenerPorId.mockResolvedValue({ ...row, rol: 'SUPER_ADMIN' });

    const result = await userService.cambiarPassword('uuid-1', { password: 'Passw0rd' });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SUPER_ADMIN_PROTECTED');
    expect(repo.actualizarPassword).not.toHaveBeenCalled();
  });

  it('devuelve RESOURCE_NOT_FOUND si el colaborador no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    const result = await userService.cambiarPassword('uuid-x', { password: 'Passw0rd' });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});

describe('userService.actualizarBloqueo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bloquea a un colaborador normal', async () => {
    repo.obtenerPorId.mockResolvedValue(row);
    repo.actualizarBloqueo.mockResolvedValue(undefined);

    const result = await userService.actualizarBloqueo('uuid-1', { bloqueado: true });

    expect(result.success).toBe(true);
    expect(repo.actualizarBloqueo).toHaveBeenCalledWith('uuid-1', true);
  });

  it('no permite bloquear a un SUPER_ADMIN', async () => {
    repo.obtenerPorId.mockResolvedValue({ ...row, rol: 'SUPER_ADMIN' });

    const result = await userService.actualizarBloqueo('uuid-1', { bloqueado: true });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SUPER_ADMIN_PROTECTED');
    expect(repo.actualizarBloqueo).not.toHaveBeenCalled();
  });

  it('devuelve RESOURCE_NOT_FOUND si el colaborador no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);

    const result = await userService.actualizarBloqueo('uuid-x', { bloqueado: false });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
