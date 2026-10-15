import { apiClient, type ApiResponse } from './apiClient';
import type {
  ActualizarModeloPayload,
  AtributoCategoriaItem,
  CrearModeloPayload,
  DeltaVariantesPayload,
  ModeloConVariantes,
  ProductoModelo,
  ResumenDelta,
} from '../types/productModel.types';

/** Cliente del catálogo de Productos Padre (Modelo) y sus SKUs (HU035). */
export const productModelsApi = {
  /** Abre el editor desde el ID de un SKU del listado. */
  obtenerPorSku(skuId: string, signal?: AbortSignal): Promise<ApiResponse<ModeloConVariantes>> {
    return apiClient.get<ModeloConVariantes>(`/api/v1/product-models/by-sku/${skuId}`, signal);
  },

  obtener(id: string, signal?: AbortSignal): Promise<ApiResponse<ModeloConVariantes>> {
    return apiClient.get<ModeloConVariantes>(`/api/v1/product-models/${id}`, signal);
  },

  crear(payload: CrearModeloPayload): Promise<ApiResponse<ProductoModelo>> {
    return apiClient.post<ProductoModelo>('/api/v1/product-models', payload);
  },

  actualizar(id: string, payload: ActualizarModeloPayload): Promise<ApiResponse<ProductoModelo>> {
    return apiClient.patch<ProductoModelo>(`/api/v1/product-models/${id}`, payload);
  },

  /** Aplica el delta de variantes en una sola transacción en el backend. */
  aplicarDelta(id: string, payload: DeltaVariantesPayload): Promise<ApiResponse<ResumenDelta>> {
    return apiClient.post<ResumenDelta>(`/api/v1/product-models/${id}/variantes/delta`, payload);
  },

  /** Atributos efectivos de la categoría (ejes habilitados y sus valores). */
  atributosCategoria(
    categoriaId: number,
    signal?: AbortSignal
  ): Promise<ApiResponse<AtributoCategoriaItem[]>> {
    return apiClient.get<AtributoCategoriaItem[]>(
      `/api/v1/categories/${categoriaId}/atributos`,
      signal
    );
  },
};
