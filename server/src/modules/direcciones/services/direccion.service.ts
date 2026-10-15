import { direccionRepository, DireccionRow } from '../repositories/direccion.repository';
import { ActualizarDireccionInput, CrearDireccionInput } from '../schemas/direccion.schemas';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** HU017: libreta de direcciones del cliente autenticado. */
export const direccionService = {
  async listar(usuarioId: string): Promise<ApiResponse<DireccionRow[]>> {
    const direcciones = await direccionRepository.listar(usuarioId);
    return { success: true, message: 'Direcciones obtenidas correctamente', data: direcciones };
  },

  async crear(usuarioId: string, input: CrearDireccionInput): Promise<ApiResponse<DireccionRow>> {
    const direccion = await direccionRepository.crear(usuarioId, input);
    return { success: true, message: 'Dirección creada correctamente', data: direccion };
  },

  async actualizar(
    usuarioId: string,
    id: string,
    input: ActualizarDireccionInput
  ): Promise<ApiResponse<DireccionRow>> {
    const direccion = await direccionRepository.actualizar(id, usuarioId, input);
    if (!direccion) return fallo('RESOURCE_NOT_FOUND', 'La dirección no existe');
    return { success: true, message: 'Dirección actualizada correctamente', data: direccion };
  },

  async marcarPrincipal(usuarioId: string, id: string): Promise<ApiResponse<{ id: string }>> {
    const ok = await direccionRepository.marcarPrincipal(id, usuarioId);
    if (!ok) return fallo('RESOURCE_NOT_FOUND', 'La dirección no existe');
    return { success: true, message: 'Dirección principal actualizada', data: { id } };
  },

  async eliminar(usuarioId: string, id: string): Promise<ApiResponse<{ id: string }>> {
    const ok = await direccionRepository.eliminar(id, usuarioId);
    if (!ok) return fallo('RESOURCE_NOT_FOUND', 'La dirección no existe');
    return { success: true, message: 'Dirección eliminada correctamente', data: { id } };
  },
};
