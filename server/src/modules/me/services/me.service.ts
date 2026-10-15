import bcrypt from 'bcrypt';
import { meRepository, PerfilRow } from '../repositories/me.repository';
import { userRepository } from '../../users/repositories/user.repository';
import { ActualizarPerfilInput, CambiarPasswordInput } from '../schemas/me.schemas';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** Perfil del usuario autenticado (cliente o interno). */
export const meService = {
  async obtener(usuarioId: string): Promise<ApiResponse<PerfilRow>> {
    const perfil = await meRepository.obtenerPerfil(usuarioId);
    if (!perfil) return fallo('RESOURCE_NOT_FOUND', 'La cuenta no existe');
    return { success: true, message: 'Perfil obtenido correctamente', data: perfil };
  },

  async actualizar(usuarioId: string, input: ActualizarPerfilInput): Promise<ApiResponse<PerfilRow>> {
    if (input.tipo_documento && input.numero_documento) {
      const duplicado = await userRepository.existeDocumentoOtro(
        input.tipo_documento,
        input.numero_documento,
        usuarioId
      );
      if (duplicado) {
        return fallo('DOCUMENT_ALREADY_EXISTS', 'El documento de identidad ya pertenece a otra cuenta');
      }
    }

    await meRepository.actualizarPerfil(usuarioId, input);

    const perfil = await meRepository.obtenerPerfil(usuarioId);
    if (!perfil) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el perfil');
    return { success: true, message: 'Perfil actualizado correctamente', data: perfil };
  },

  async cambiarPassword(usuarioId: string, input: CambiarPasswordInput): Promise<ApiResponse<null>> {
    const hash = await meRepository.obtenerPasswordHash(usuarioId);
    if (!hash) return fallo('RESOURCE_NOT_FOUND', 'La cuenta no existe');

    const valida = await bcrypt.compare(input.password_actual, hash);
    if (!valida) return fallo('INVALID_PASSWORD', 'La contraseña actual es incorrecta');

    const nueva = await bcrypt.hash(input.password_nueva, BCRYPT_ROUNDS);
    await meRepository.actualizarPasswordHash(usuarioId, nueva);

    return { success: true, message: 'Contraseña actualizada correctamente', data: null };
  },
};
