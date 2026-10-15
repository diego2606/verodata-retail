import {
  bannerRepository,
  BannerRow,
  CrearBannerData,
  ActualizarBannerData,
} from '../repositories/banner.repository';
import {
  ActualizarBannerInput,
  CrearBannerInput,
  ListarBannersQuery,
} from '../schemas/banner.schemas';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** HU034: un banner se muestra solo si está activo y dentro de su vigencia. */
export function estaVigente(
  banner: Pick<BannerRow, 'activo' | 'vigente_desde' | 'vigente_hasta'>,
  ahora: Date = new Date()
): boolean {
  if (!banner.activo) return false;
  if (banner.vigente_desde && banner.vigente_desde.getTime() > ahora.getTime()) return false;
  if (banner.vigente_hasta && banner.vigente_hasta.getTime() < ahora.getTime()) return false;
  return true;
}

function limpiar(valor: string | null | undefined): string | null {
  return valor && valor.trim() ? valor.trim() : null;
}

function validarVigencia(desde: string | null, hasta: string | null): string | null {
  if (desde && hasta && new Date(desde).getTime() > new Date(hasta).getTime()) {
    return 'La fecha de inicio no puede ser posterior a la de fin';
  }
  return null;
}

export const bannerService = {
  async listar(filtros: ListarBannersQuery): Promise<ApiResponse<BannerRow[]>> {
    const banners = await bannerRepository.listar(filtros);
    return { success: true, message: 'Banners obtenidos correctamente', data: banners };
  },

  async crear(input: CrearBannerInput): Promise<ApiResponse<BannerRow>> {
    const data: CrearBannerData = {
      ubicacion: input.ubicacion,
      titulo: input.titulo,
      subtitulo: limpiar(input.subtitulo),
      cta_texto: limpiar(input.cta_texto),
      cta_url: limpiar(input.cta_url),
      imagen_url: input.imagen_url,
      orden: input.orden ?? 0,
      activo: input.activo ?? true,
      vigente_desde: limpiar(input.vigente_desde),
      vigente_hasta: limpiar(input.vigente_hasta),
    };

    const error = validarVigencia(data.vigente_desde, data.vigente_hasta);
    if (error) return fallo('INVALID_VIGENCIA', error);

    const banner = await bannerRepository.crear(data);
    return { success: true, message: 'Banner creado correctamente', data: banner };
  },

  async actualizar(id: string, input: ActualizarBannerInput): Promise<ApiResponse<BannerRow>> {
    const actual = await bannerRepository.obtenerPorId(id);
    if (!actual) return fallo('RESOURCE_NOT_FOUND', 'El banner con el ID especificado no existe');

    const data: ActualizarBannerData = {};
    if (input.ubicacion !== undefined) data.ubicacion = input.ubicacion;
    if (input.titulo !== undefined) data.titulo = input.titulo;
    if (input.subtitulo !== undefined) data.subtitulo = limpiar(input.subtitulo);
    if (input.cta_texto !== undefined) data.cta_texto = limpiar(input.cta_texto);
    if (input.cta_url !== undefined) data.cta_url = limpiar(input.cta_url);
    if (input.imagen_url !== undefined) data.imagen_url = input.imagen_url;
    if (input.orden !== undefined) data.orden = input.orden;
    if (input.activo !== undefined) data.activo = input.activo;
    if (input.vigente_desde !== undefined) data.vigente_desde = limpiar(input.vigente_desde);
    if (input.vigente_hasta !== undefined) data.vigente_hasta = limpiar(input.vigente_hasta);

    const desde = data.vigente_desde !== undefined ? data.vigente_desde : (actual.vigente_desde?.toISOString() ?? null);
    const hasta = data.vigente_hasta !== undefined ? data.vigente_hasta : (actual.vigente_hasta?.toISOString() ?? null);
    const error = validarVigencia(desde, hasta);
    if (error) return fallo('INVALID_VIGENCIA', error);

    await bannerRepository.actualizar(id, data);
    const actualizado = await bannerRepository.obtenerPorId(id);
    if (!actualizado) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el banner actualizado');
    return { success: true, message: 'Banner actualizado correctamente', data: actualizado };
  },

  async eliminar(id: string): Promise<ApiResponse<{ id: string }>> {
    const eliminado = await bannerRepository.eliminar(id);
    if (!eliminado) return fallo('RESOURCE_NOT_FOUND', 'El banner con el ID especificado no existe');
    return { success: true, message: 'Banner eliminado correctamente', data: { id } };
  },

  async reordenar(ids: string[]): Promise<ApiResponse<{ ids: string[] }>> {
    await bannerRepository.reordenar(ids);
    return { success: true, message: 'Orden actualizado correctamente', data: { ids } };
  },
};
