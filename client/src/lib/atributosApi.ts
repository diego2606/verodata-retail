import { apiClient, type ApiResponse } from './apiClient';
import type {
  ActualizarAtributoPayload,
  ActualizarValorPayload,
  AtributoItem,
  CrearAtributoPayload,
  CrearValorPayload,
} from '../types/atributo.types';

/** Cliente del maestro de atributos (Backoffice). */
export const atributosApi = {
  listar(signal?: AbortSignal): Promise<ApiResponse<AtributoItem[]>> {
    return apiClient.get<AtributoItem[]>('/api/v1/atributos', signal);
  },

  crear(payload: CrearAtributoPayload): Promise<ApiResponse<AtributoItem>> {
    return apiClient.post<AtributoItem>('/api/v1/atributos', payload);
  },

  actualizar(id: number, payload: ActualizarAtributoPayload): Promise<ApiResponse<AtributoItem>> {
    return apiClient.patch<AtributoItem>(`/api/v1/atributos/${id}`, payload);
  },

  eliminar(id: number): Promise<ApiResponse<{ id: number }>> {
    return apiClient.delete<{ id: number }>(`/api/v1/atributos/${id}`);
  },

  crearValor(atributoId: number, payload: CrearValorPayload): Promise<ApiResponse<AtributoItem>> {
    return apiClient.post<AtributoItem>(`/api/v1/atributos/${atributoId}/valores`, payload);
  },

  actualizarValor(valorId: number, payload: ActualizarValorPayload): Promise<ApiResponse<AtributoItem>> {
    return apiClient.patch<AtributoItem>(`/api/v1/atributos/valores/${valorId}`, payload);
  },

  eliminarValor(valorId: number): Promise<ApiResponse<{ id: number }>> {
    return apiClient.delete<{ id: number }>(`/api/v1/atributos/valores/${valorId}`);
  },
};
