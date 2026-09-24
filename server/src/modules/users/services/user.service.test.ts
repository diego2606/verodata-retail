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
    existeUsuario: vi.fn(),
    actualizarBloqueo: vi.fn(),
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
