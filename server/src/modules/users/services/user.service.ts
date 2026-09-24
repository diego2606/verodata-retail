import bcrypt from 'bcrypt';
import { userRepository, RolRow, UsuarioListadoRow } from '../repositories/user.repository';
import {
  ActualizarBloqueoInput,
  CrearUsuarioInput,
  ListarUsuariosQuery,
} from '../schemas/user.schemas';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

export interface UsuarioCreado {
  id: string;
  email: string;
}

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

export const userService = {
  /** HU003: consulta y auditoría de colaboradores internos. */
  async listar(filtros: ListarUsuariosQuery): Promise<ApiResponse<UsuarioListadoRow[]>> {
    const usuarios = await userRepository.listar(filtros);
    return {
      success: true,
      message: 'Colaboradores obtenidos correctamente',
      data: usuarios,
    };
  },

  /** Catálogo de roles para el formulario de alta (id_rol — 3FN). */
  async listarRoles(): Promise<ApiResponse<RolRow[]>> {
    const roles = await userRepository.listarRoles();
    return { success: true, message: 'Roles obtenidos correctamente', data: roles };
  },

  /** HU002: registro de personal interno con documento de identidad. */
  async crear(input: CrearUsuarioInput): Promise<ApiResponse<UsuarioCreado>> {
    if (await userRepository.existeEmail(input.email)) {
      return fallo('EMAIL_ALREADY_EXISTS', 'El correo electrónico ya está registrado');
    }

    if (await userRepository.existeDocumento(input.tipo_documento, input.numero_documento)) {
      return fallo('DOCUMENT_ALREADY_EXISTS', 'El documento de identidad ya está registrado');
    }

    if (!(await userRepository.existeRol(input.id_rol))) {
      return fallo('ROLE_NOT_FOUND', 'El rol seleccionado no existe');
    }

    const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const id = await userRepository.crear({
      email: input.email,
      password_hash,
      rol_id: input.id_rol, // id_rol del contrato → rol_id en DB real
      tipo_documento: input.tipo_documento,
      numero_documento: input.numero_documento,
      nombres: input.nombres,
      apellidos: input.apellidos,
      telefono: input.telefono ?? null,
    });

    return {
      success: true,
      message: 'Colaborador registrado exitosamente',
      data: { id, email: input.email },
    };
  },

  /** Bloqueo / desbloqueo de cuenta de colaborador. */
  async actualizarBloqueo(
    id: string,
    input: ActualizarBloqueoInput
  ): Promise<ApiResponse<{ id: string; bloqueado: boolean }>> {
    if (!(await userRepository.existeUsuario(id))) {
      return fallo('RESOURCE_NOT_FOUND', 'El colaborador con el ID especificado no existe');
    }

    await userRepository.actualizarBloqueo(id, input.bloqueado);

    return {
      success: true,
      message: input.bloqueado ? 'Cuenta bloqueada' : 'Cuenta desbloqueada',
      data: { id, bloqueado: input.bloqueado },
    };
  },
};
