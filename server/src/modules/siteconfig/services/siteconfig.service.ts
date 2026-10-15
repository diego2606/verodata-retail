import { siteConfigRepository, SiteConfigRow } from '../repositories/siteconfig.repository';
import { ApiResponse } from '../../../shared/types/api.types';

export const siteConfigService = {
  async listar(): Promise<ApiResponse<SiteConfigRow[]>> {
    const config = await siteConfigRepository.listar();
    return { success: true, message: 'Configuración obtenida correctamente', data: config };
  },

  async actualizar(clave: string, valor: unknown): Promise<ApiResponse<SiteConfigRow>> {
    const config = await siteConfigRepository.upsert(clave, valor);
    return { success: true, message: 'Configuración actualizada correctamente', data: config };
  },
};
