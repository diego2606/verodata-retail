import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from '../repositories/auth.repository';
import { LoginInput, RegistroInput } from '../schemas/auth.schemas';
import {
  ApiFailure,
  ApiResponse,
  JwtPayload,
  TipoDocumento,
} from '../../../shared/types/api.types';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as string;
const MAX_INTENTOS = 3;

export interface LoginResult {
  token: string;
  usuario: { id: string; email: string; rol: string };
}

export interface RegistroResult {
  id: string;
  email: string;
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
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    return {
      success: true,
      message: 'Autenticación exitosa',
      data: { token, usuario: { id: usuario.id, email: usuario.email, rol } },
    };
  },

  async registro(data: RegistroInput): Promise<ApiResponse<RegistroResult>> {
    // CA02: Unicidad de email
    if (await authRepository.existeEmail(data.email)) {
      return fallo('EMAIL_ALREADY_EXISTS', 'El correo electrónico ya está registrado');
    }

    // CA03: Unicidad de documento
    const docExiste = await authRepository.existeDocumento(
      data.tipo_documento as TipoDocumento,
      data.numero_documento
    );
    if (docExiste) {
      return fallo('DOCUMENT_ALREADY_EXISTS', 'El documento de identidad ya está registrado');
    }

    // CA04: Cifrado BCrypt (costo 10)
    const password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // CA05: Transacción atómica en repositorio
    const id = await authRepository.registrarUsuario({
      email: data.email,
      password_hash,
      rol_id: data.id_rol, // mapeo: id_rol del schema → rol_id en DB real
      nombres: data.nombres,
      apellidos: data.apellidos,
      tipo_documento: data.tipo_documento as TipoDocumento,
      numero_documento: data.numero_documento,
      telefono: data.telefono,
    });

    return {
      success: true,
      message: 'Colaborador registrado exitosamente',
      data: { id, email: data.email },
    };
  },
};
