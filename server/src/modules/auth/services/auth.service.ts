import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { authRepository } from '../repositories/auth.repository';
import { userRepository } from '../../users/repositories/user.repository';
import {
  LoginInput,
  RegistroClienteInput,
  RestablecerPasswordInput,
} from '../schemas/auth.schemas';
import { ApiFailure, ApiResponse, JwtPayload } from '../../../shared/types/api.types';

const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as string;
const JWT_REMEMBER_EXPIRES_IN = (process.env.JWT_REMEMBER_EXPIRES_IN ?? '30d') as string;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);
const MAX_INTENTOS = 3;
const RESET_TTL_MINUTOS = 30;

export interface LoginResult {
  token: string;
  usuario: { id: string; email: string; rol: string; nombre: string | null };
}

export interface ClienteRegistrado {
  id: string;
  email: string;
}

export interface RecuperarResult {
  token: string | null;
  expira_en: string | null;
}

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** Hash SHA-256 del token de recuperación (nunca se guarda el token en claro). */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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
      data: {
        token,
        usuario: { id: usuario.id, email: usuario.email, rol, nombre: usuario.nombres },
      },
    };
  },

  /** Registro directo de cliente (rol CLIENTE), sin verificación por correo. */
  async registrar(input: RegistroClienteInput): Promise<ApiResponse<ClienteRegistrado>> {
    if (await userRepository.existeEmail(input.email)) {
      return fallo('EMAIL_ALREADY_EXISTS', 'El correo electrónico ya está registrado');
    }
    if (await userRepository.existeDocumento(input.tipo_documento, input.numero_documento)) {
      return fallo('DOCUMENT_ALREADY_EXISTS', 'El documento de identidad ya está registrado');
    }

    const rolId = await authRepository.obtenerRolIdPorNombre('CLIENTE');
    if (rolId === null) {
      return fallo('ROLE_NOT_FOUND', 'El rol CLIENTE no está configurado en el sistema');
    }

    const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const id = await userRepository.crear({
      email: input.email,
      password_hash,
      rol_id: rolId,
      tipo_documento: input.tipo_documento,
      numero_documento: input.numero_documento,
      nombres: input.nombres,
      apellidos: input.apellidos,
      telefono: input.telefono ?? null,
    });

    return {
      success: true,
      message: 'Cuenta creada exitosamente',
      data: { id, email: input.email },
    };
  },

  /**
   * Genera un token de recuperación. La respuesta es genérica si el correo no
   * existe (no revela cuentas). Sin servicio de correo, el token se devuelve en
   * la respuesta para poder completar el flujo en desarrollo.
   */
  async recuperar(email: string): Promise<ApiResponse<RecuperarResult>> {
    const usuario = await authRepository.findByEmail(email);
    if (!usuario || usuario.bloqueado) {
      return {
        success: true,
        message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
        data: { token: null, expira_en: null },
      };
    }

    const token = randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + RESET_TTL_MINUTOS * 60 * 1000);
    await authRepository.crearReset(usuario.id, hashToken(token), expira);

    return {
      success: true,
      message: 'Token de recuperación generado (modo desarrollo, sin envío de correo).',
      data: { token, expira_en: expira.toISOString() },
    };
  },

  async restablecer(input: RestablecerPasswordInput): Promise<ApiResponse<null>> {
    const reset = await authRepository.obtenerResetValido(hashToken(input.token));
    if (!reset || reset.usado_en || new Date(reset.expira_en).getTime() < Date.now()) {
      return fallo('INVALID_TOKEN', 'El enlace de recuperación es inválido o expiró');
    }

    const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await authRepository.actualizarPasswordHash(reset.usuario_id, password_hash);
    await authRepository.marcarResetUsado(reset.id);

    return { success: true, message: 'Contraseña restablecida correctamente', data: null };
  },
};
