import {
  AlertaStockRow,
  InventarioRow,
  inventoryRepository,
} from '../repositories/inventory.repository';
import { AjustarInventarioInput } from '../schemas/inventory.schemas';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

export const inventoryService = {
  /**
   * HU010: registra un ajuste de existencias (ingreso o merma) y/o el stock mínimo.
   * HU011: la deducción/ajuste es atómico e impide stock negativo (CA02).
   */
  async ajustar(
    productoId: string,
    input: AjustarInventarioInput
  ): Promise<ApiResponse<InventarioRow>> {
    const inventario = await inventoryRepository.ajustar(
      productoId,
      input.ajuste,
      input.stock_minimo ?? null
    );

    if (!inventario) {
      // No hubo filas: o el producto no existe, o el ajuste dejaría el stock negativo.
      const existe = await inventoryRepository.obtenerPorProducto(productoId);
      if (!existe) {
        return fallo('RESOURCE_NOT_FOUND', 'El producto con el ID especificado no existe');
      }
      return fallo(
        'INSUFFICIENT_STOCK',
        'El ajuste dejaría el stock en negativo. Revisa la cantidad a descontar.'
      );
    }

    return { success: true, message: 'Inventario ajustado correctamente', data: inventario };
  },

  /** HU012 CA03: listado de productos con alerta de stock (stock_actual <= stock_minimo). */
  async listarAlertas(): Promise<ApiResponse<AlertaStockRow[]>> {
    const alertas = await inventoryRepository.listarAlertas();
    return { success: true, message: 'Alertas de stock obtenidas correctamente', data: alertas };
  },
};
