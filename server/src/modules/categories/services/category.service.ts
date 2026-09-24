import { categoryRepository, CategoriaRow } from '../repositories/category.repository';
import {
  ActualizarCategoriaInput,
  CrearCategoriaInput,
  ListarCategoriasQuery,
} from '../schemas/category.schemas';
import { slugify } from '../../../shared/utils/slugify';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

export const categoryService = {
  /** HU006: listado de categorías. */
  async listar(filtros: ListarCategoriasQuery): Promise<ApiResponse<CategoriaRow[]>> {
    const categorias = await categoryRepository.listar(filtros);
    return { success: true, message: 'Categorías obtenidas correctamente', data: categorias };
  },

  /** HU006 CA01-CA03: creación con slug normalizado y único. */
  async crear(input: CrearCategoriaInput): Promise<ApiResponse<CategoriaRow>> {
    const slug = slugify(input.slug?.trim() ? input.slug : input.nombre);
    if (!slug) {
      return fallo('INVALID_SLUG', 'No se pudo generar un slug válido a partir del nombre');
    }

    if (await categoryRepository.existeNombre(input.nombre)) {
      return fallo('NAME_ALREADY_EXISTS', 'Ya existe una categoría con ese nombre');
    }
    if (await categoryRepository.existeSlug(slug)) {
      return fallo('SLUG_ALREADY_EXISTS', 'Ya existe una categoría con ese slug');
    }

    const id = await categoryRepository.crear({
      nombre: input.nombre,
      slug,
      descripcion: input.descripcion ? input.descripcion : null,
    });
    const creada = await categoryRepository.obtenerPorId(id);
    if (!creada) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar la categoría creada');
    }

    return { success: true, message: 'Categoría creada correctamente', data: creada };
  },

  /** HU006: actualización de nombre/slug y cambio de estado (activo). */
  async actualizar(
    id: number,
    input: ActualizarCategoriaInput
  ): Promise<ApiResponse<CategoriaRow>> {
    const actual = await categoryRepository.obtenerPorId(id);
    if (!actual) {
      return fallo('RESOURCE_NOT_FOUND', 'La categoría con el ID especificado no existe');
    }

    let slug: string | null = null;
    if (input.slug !== undefined) {
      slug = slugify(input.slug);
      if (!slug) {
        return fallo('INVALID_SLUG', 'El slug proporcionado no es válido');
      }
      if (slug !== actual.slug && (await categoryRepository.existeSlug(slug, id))) {
        return fallo('SLUG_ALREADY_EXISTS', 'Ya existe otra categoría con ese slug');
      }
    }

    if (input.nombre && input.nombre !== actual.nombre) {
      if (await categoryRepository.existeNombre(input.nombre, id)) {
        return fallo('NAME_ALREADY_EXISTS', 'Ya existe otra categoría con ese nombre');
      }
    }

    await categoryRepository.actualizar(id, {
      nombre: input.nombre ?? null,
      slug,
      // undefined = no cambiar; '' = limpiar (se guarda cadena vacía)
      descripcion: input.descripcion !== undefined ? input.descripcion : null,
      activo: input.activo ?? null,
    });

    const actualizada = await categoryRepository.obtenerPorId(id);
    if (!actualizada) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar la categoría actualizada');
    }

    return { success: true, message: 'Categoría actualizada correctamente', data: actualizada };
  },

  /** HU006 CA04: bloquea el borrado físico si la categoría tiene productos. */
  async eliminar(id: number): Promise<ApiResponse<{ id: number }>> {
    if (!(await categoryRepository.obtenerPorId(id))) {
      return fallo('RESOURCE_NOT_FOUND', 'La categoría con el ID especificado no existe');
    }

    if (await categoryRepository.tieneProductos(id)) {
      return fallo(
        'CATEGORY_HAS_PRODUCTS',
        'No se puede eliminar una categoría con productos asociados. Desactívala en su lugar.'
      );
    }

    await categoryRepository.eliminar(id);
    return { success: true, message: 'Categoría eliminada correctamente', data: { id } };
  },
};
