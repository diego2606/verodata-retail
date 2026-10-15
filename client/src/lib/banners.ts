import { apiClient, type ApiResponse } from './apiClient';
import type {
  ActualizarBannerPayload,
  BannerItem,
  BannerUbicacion,
  CrearBannerPayload,
  SiteConfigItem,
} from '../types/banner.types';

/** Cliente de administración del contenido de portada (HU034). */
export const bannersApi = {
  listar(ubicacion: BannerUbicacion, signal?: AbortSignal): Promise<ApiResponse<BannerItem[]>> {
    return apiClient.get<BannerItem[]>(`/api/v1/banners?ubicacion=${ubicacion}`, signal);
  },

  crear(payload: CrearBannerPayload): Promise<ApiResponse<BannerItem>> {
    return apiClient.post<BannerItem>('/api/v1/banners', payload);
  },

  actualizar(id: string, payload: ActualizarBannerPayload): Promise<ApiResponse<BannerItem>> {
    return apiClient.patch<BannerItem>(`/api/v1/banners/${id}`, payload);
  },

  eliminar(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient.delete<{ id: string }>(`/api/v1/banners/${id}`);
  },

  reordenar(ids: string[]): Promise<ApiResponse<{ ids: string[] }>> {
    return apiClient.patch<{ ids: string[] }>('/api/v1/banners/orden', { ids });
  },
};

/** Cliente de configuración y franjas globales de la tienda (HU034). */
export const siteConfigApi = {
  listar(signal?: AbortSignal): Promise<ApiResponse<SiteConfigItem[]>> {
    return apiClient.get<SiteConfigItem[]>('/api/v1/site-config', signal);
  },

  actualizar(clave: string, valor: unknown): Promise<ApiResponse<SiteConfigItem>> {
    return apiClient.patch<SiteConfigItem>(`/api/v1/site-config/${clave}`, { valor });
  },
};
