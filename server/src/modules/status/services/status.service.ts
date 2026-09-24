import { statusRepository } from '../repositories/status.repository';
import { ApiResponse } from '../../../shared/types/api.types';

const VERSION = '1.0.0';

export interface SystemStatus {
  version: string;
  db: 'ok' | 'down';
  latencyMs: number;
  categoriasActivas: number;
  productosActivos: number;
  uptimeSeconds: number;
}

/**
 * Estado público del sistema (sin datos sensibles ni PII).
 * Nota: ampliar con inventario/alertas tras HU007/HU012.
 */
export const statusService = {
  async obtener(): Promise<ApiResponse<SystemStatus>> {
    const uptimeSeconds = Math.floor(process.uptime());

    try {
      const latencyMs = await statusRepository.ping();
      const [categoriasActivas, productosActivos] = await Promise.all([
        statusRepository.contarCategoriasActivas(),
        statusRepository.contarProductosActivos(),
      ]);

      return {
        success: true,
        message: 'Estado del sistema',
        data: {
          version: VERSION,
          db: 'ok',
          latencyMs,
          categoriasActivas,
          productosActivos,
          uptimeSeconds,
        },
      };
    } catch (error) {
      console.error('[StatusService] error:', error);
      return {
        success: true,
        message: 'Estado del sistema',
        data: {
          version: VERSION,
          db: 'down',
          latencyMs: 0,
          categoriasActivas: 0,
          productosActivos: 0,
          uptimeSeconds,
        },
      };
    }
  },
};
