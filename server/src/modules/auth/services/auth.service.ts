import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from '../repositories/auth.repository';
import { LoginInput } from '../schemas/auth.schemas';
import { ApiFailure, ApiResponse, JwtPayload } from '../../../shared/types/api.types';

const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as string;
const JWT_REMEMBER_EXPIRES_IN = (process.env.JWT_REMEMBER_EXPIRES_IN ?? '30d') as string;
const MAX_INTENTOS = 3;

export interface LoginResult {
  token: string;
  usuario: { id: string; email: string; rol: string };
}

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

export const authService = {
  async login(data: LoginInput): Promise<ApiResponse<LoginResult>> {
    const usuario = await authRepository.findByEmail(data.email);

    // Usuario no encontrado o cuenta bloqueada (bloqueado=TRUE = suspendida)
    if (!usuario || usuario.bloqueado) {
      return fallo('INVALID_CREDENTIALS', 'Credenciales inválidas');
    }

    // Bloqueo temporal (columna NULL en el esquema actual)
    if (usuario.bloqueado_hasta && new Date() < new Date(usuario.bloqueado_hasta)) {
      return fallo('ACCOUNT_TEMPORARILY_LOCKED', 'Cuenta temporalmente bloqueada. Intenta más tarde.');
    }

    const passwordValida = await bcrypt.compare(data.password, usuario.password_hash);

    if (!passwordValida) {
      const intentos = await authRepository.incrementarIntentosFallidos(usuario.id);
      if (intentos >= MAX_INTENTOS) {
        // CA04 (HU015): flag de bloqueo preventivo → dispara el modal de seguridad
        return fallo('MAX_LOGIN_ATTEMPTS', 'Credenciales inválidas', { bloqueado: true });
      }
      return fallo('INVALID_CREDENTIALS', 'Credenciales inválidas');
    }

    // Credenciales correctas: resetear intentos y emitir JWT
    await authRepository.resetearIntentosFallidos(usuario.id);

    const rol = usuario.nombre_rol as JwtPayload['rol'];
    const payload: JwtPayload = { id_usuario: usuario.id, email: usuario.email, rol };
    const expiresIn = data.recordar ? JWT_REMEMBER_EXPIRES_IN : JWT_EXPIRES_IN;
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);

    return {
      success: true,
      message: 'Autenticación exitosa',
      data: { token, usuario: { id: usuario.id, email: usuario.email, rol } },
    };
  },
};
