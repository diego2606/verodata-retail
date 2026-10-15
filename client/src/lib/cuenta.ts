import { apiClient, type ApiResponse } from './apiClient';
import type {
  ActualizarPerfilPayload,
  CambiarPasswordPayload,
  DireccionItem,
  DireccionPayload,
  LoginClienteResult,
  PerfilCliente,
  RecuperarResult,
  RegistroClientePayload,
} from '../types/cuenta.types';

/** Cliente de API de la cuenta de cliente (auth + perfil + direcciones). */
export const cuentaApi = {
  registrar(payload: RegistroClientePayload): Promise<ApiResponse<{ id: string; email: string }>> {
    return apiClient.post<{ id: string; email: string }>('/api/v1/auth/registro', payload);
  },

  login(payload: {
    email: string;
    password: string;
    recordar?: boolean;
  }): Promise<ApiResponse<LoginClienteResult>> {
    return apiClient.post<LoginClienteResult>('/api/v1/auth/login', payload);
  },

  recuperar(email: string): Promise<ApiResponse<RecuperarResult>> {
    return apiClient.post<RecuperarResult>('/api/v1/auth/recuperar', { email });
  },

  restablecer(token: string, password: string): Promise<ApiResponse<null>> {
    return apiClient.post<null>('/api/v1/auth/restablecer', { token, password });
  },

  obtenerPerfil(signal?: AbortSignal): Promise<ApiResponse<PerfilCliente>> {
    return apiClient.get<PerfilCliente>('/api/v1/me', signal);
  },

  actualizarPerfil(payload: ActualizarPerfilPayload): Promise<ApiResponse<PerfilCliente>> {
    return apiClient.patch<PerfilCliente>('/api/v1/me', payload);
  },

  cambiarPassword(payload: CambiarPasswordPayload): Promise<ApiResponse<null>> {
    return apiClient.patch<null>('/api/v1/me/password', payload);
  },

  listarDirecciones(signal?: AbortSignal): Promise<ApiResponse<DireccionItem[]>> {
    return apiClient.get<DireccionItem[]>('/api/v1/me/direcciones', signal);
  },

  crearDireccion(payload: DireccionPayload): Promise<ApiResponse<DireccionItem>> {
    return apiClient.post<DireccionItem>('/api/v1/me/direcciones', payload);
  },

  actualizarDireccion(id: string, payload: DireccionPayload): Promise<ApiResponse<DireccionItem>> {
    return apiClient.patch<DireccionItem>(`/api/v1/me/direcciones/${id}`, payload);
  },

  marcarPrincipal(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient.patch<{ id: string }>(`/api/v1/me/direcciones/${id}/principal`, {});
  },

  eliminarDireccion(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient.delete<{ id: string }>(`/api/v1/me/direcciones/${id}`);
  },
};
