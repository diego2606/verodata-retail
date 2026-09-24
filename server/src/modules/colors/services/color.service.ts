import { colorRepository, ColorRow } from '../repositories/color.repository';
import {
  ActualizarColorInput,
  CrearColorInput,
  ListarColoresQuery,
} from '../schemas/color.schemas';
import { slugify } from '../../../shared/utils/slugify';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

export const colorService = {
  /** HU032: listado de colores (nombre + hex) para swatches. */
  async listar(filtros: ListarColoresQuery): Promise<ApiResponse<ColorRow[]>> {
    const colores = await colorRepository.listar(filtros);
    return { success: true, message: 'Colores obtenidos correctamente', data: colores };
  },

  async crear(input: CrearColorInput): Promise<ApiResponse<ColorRow>> {
    const slug = slugify(input.nombre);
    if (!slug) {
      return fallo('INVALID_SLUG', 'No se pudo generar un slug válido a partir del nombre');
    }
    if (await colorRepository.existeNombre(input.nombre)) {
      return fallo('NAME_ALREADY_EXISTS', 'Ya existe un color con ese nombre');
    }
    if (await colorRepository.existeSlug(slug)) {
      return fallo('SLUG_ALREADY_EXISTS', 'Ya existe un color con ese slug');
    }
    const id = await colorRepository.crear({ nombre: input.nombre, slug, hex: input.hex });
    const creado = await colorRepository.obtenerPorId(id);
    if (!creado) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el color creado');
    return { success: true, message: 'Color creado correctamente', data: creado };
  },

  async actualizar(id: number, input: ActualizarColorInput): Promise<ApiResponse<ColorRow>> {
    const actual = await colorRepository.obtenerPorId(id);
    if (!actual) {
      return fallo('RESOURCE_NOT_FOUND', 'El color con el ID especificado no existe');
    }

    let slug: string | undefined;
    if (input.nombre !== undefined && input.nombre !== actual.nombre) {
      if (await colorRepository.existeNombre(input.nombre, id)) {
        return fallo('NAME_ALREADY_EXISTS', 'Ya existe otro color con ese nombre');
      }
      slug = slugify(input.nombre);
      if (!slug || (await colorRepository.existeSlug(slug, id))) {
        return fallo('SLUG_ALREADY_EXISTS', 'Ya existe otro color con ese slug');
      }
    }

    await colorRepository.actualizar(id, {
      nombre: input.nombre,
      slug,
      hex: input.hex,
      activo: input.activo,
    });

    const actualizado = await colorRepository.obtenerPorId(id);
    if (!actualizado) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el color actualizado');
    return { success: true, message: 'Color actualizado correctamente', data: actualizado };
  },
};
