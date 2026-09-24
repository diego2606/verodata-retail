import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';

vi.mock('../repositories/auth.repository', () => ({
  authRepository: {
    findByEmail: vi.fn(),
    incrementarIntentosFallidos: vi.fn(),
    resetearIntentosFallidos: vi.fn(),
  },
}));

import { authService } from './auth.service';
import { authRepository } from '../repositories/auth.repository';

const repo = authRepository as unknown as {
  findByEmail: ReturnType<typeof vi.fn>;
  incrementarIntentosFallidos: ReturnType<typeof vi.fn>;
  resetearIntentosFallidos: ReturnType<typeof vi.fn>;
};

const HASH = bcrypt.hashSync('Secret123', 10);

const usuarioBase = {
  id: 'uuid-1',
  email: 'admin@verodata.com',
  password_hash: HASH,
  rol_id: 1,
  nombre_rol: 'SUPER_ADMIN',
  bloqueado: false,
  intentos_fallidos: 0,
  bloqueado_hasta: null,
};

describe('authService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.resetearIntentosFallidos.mockResolvedValue(undefined);
  });

  it('emite JWT con credenciales válidas y resetea intentos', async () => {
    repo.findByEmail.mockResolvedValue(usuarioBase);

    const result = await authService.login({ email: usuarioBase.email, password: 'Secret123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBeTruthy();
      expect(result.data.usuario.rol).toBe('SUPER_ADMIN');
    }
    expect(repo.resetearIntentosFallidos).toHaveBeenCalledWith('uuid-1');
  });

  it('rechaza credenciales inválidas e incrementa el contador', async () => {
    repo.findByEmail.mockResolvedValue(usuarioBase);
    repo.incrementarIntentosFallidos.mockResolvedValue(1);

    const result = await authService.login({ email: usuarioBase.email, password: 'WrongPass1' });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_CREDENTIALS');
    expect(repo.incrementarIntentosFallidos).toHaveBeenCalledWith('uuid-1');
  });

  it('devuelve MAX_LOGIN_ATTEMPTS con flag bloqueado al 3.er intento', async () => {
    repo.findByEmail.mockResolvedValue(usuarioBase);
    repo.incrementarIntentosFallidos.mockResolvedValue(3);

    const result = await authService.login({ email: usuarioBase.email, password: 'WrongPass1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MAX_LOGIN_ATTEMPTS');
      expect(result.error.details).toEqual({ bloqueado: true });
    }
  });

  it('rechaza un usuario inexistente', async () => {
    repo.findByEmail.mockResolvedValue(null);

    const result = await authService.login({ email: 'no@existe.com', password: 'Secret123' });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rechaza una cuenta bloqueada sin comparar contraseña', async () => {
    repo.findByEmail.mockResolvedValue({ ...usuarioBase, bloqueado: true });

    const result = await authService.login({ email: usuarioBase.email, password: 'Secret123' });

    expect(result.success).toBe(false);
    expect(repo.incrementarIntentosFallidos).not.toHaveBeenCalled();
  });
});
