import { apiClient, type ApiResponse } from './apiClient';
import type {
  CrearProveedorPayload,
  CrearReposicionPayload,
  FiltrosReposiciones,
  PaginaReposiciones,
  ProveedorItem,
  RecepcionResultado,
  ReposicionDetalle,
  ReposicionItem,
} from '../types/reposicion.types';

/** Serializa los filtros del historial a query string. */
function aQueryString(filtros: FiltrosReposiciones): string {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('limit', String(filtros.limit));
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.proveedor_id) params.set('proveedor_id', filtros.proveedor_id);
  return params.toString();
}

/** HU036 — endpoints de abastecimiento y reposición de stock. */
export const reposicionesApi = {
  listarProveedores: (): Promise<ApiResponse<ProveedorItem[]>> =>
    apiClient.get<ProveedorItem[]>('/api/v1/proveedores'),

  crearProveedor: (payload: CrearProveedorPayload): Promise<ApiResponse<ProveedorItem>> =>
    apiClient.post<ProveedorItem>('/api/v1/proveedores', payload),

  listar: (filtros: FiltrosReposiciones): Promise<ApiResponse<PaginaReposiciones>> =>
    apiClient.get<PaginaReposiciones>(`/api/v1/reposiciones?${aQueryString(filtros)}`),

  obtener: (id: string): Promise<ApiResponse<ReposicionDetalle>> =>
    apiClient.get<ReposicionDetalle>(`/api/v1/reposiciones/${id}`),

  crear: (payload: CrearReposicionPayload): Promise<ApiResponse<ReposicionDetalle>> =>
    apiClient.post<ReposicionDetalle>('/api/v1/reposiciones', payload),

  recibir: (id: string): Promise<ApiResponse<RecepcionResultado>> =>
    apiClient.patch<RecepcionResultado>(`/api/v1/reposiciones/${id}/recibir`, {}),

  cancelar: (id: string, motivo: string | null): Promise<ApiResponse<ReposicionItem>> =>
    apiClient.patch<ReposicionItem>(`/api/v1/reposiciones/${id}/cancelar`, { motivo }),
};
