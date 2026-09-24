import { productRepository, ProductoRow } from '../repositories/product.repository';
import {
  ActualizarProductoInput,
  CrearProductoInput,
  ListarProductosQuery,
} from '../schemas/product.schemas';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

export const productService = {
  /** HU007: listado del catálogo con filtros. */
  async listar(filtros: ListarProductosQuery): Promise<ApiResponse<ProductoRow[]>> {
    const productos = await productRepository.listar(filtros);
    return { success: true, message: 'Productos obtenidos correctamente', data: productos };
  },

  /** HU007: creación de artículo con SKU único e inventario inicial (0/5). */
  async crear(input: CrearProductoInput): Promise<ApiResponse<ProductoRow>> {
    // Normalización de SKU (mayúsculas) para evitar duplicados por caja
    const sku = input.sku.trim().toUpperCase();

    if (await productRepository.existeSku(sku)) {
      return fallo('SKU_ALREADY_EXISTS', 'Ya existe un producto con ese SKU');
    }

    if (!(await productRepository.existeCategoria(input.categoria_id))) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
    }

    const id = await productRepository.crear({
      categoria_id: input.categoria_id,
      sku,
      nombre: input.nombre,
      descripcion: input.descripcion,
      precio_regular: input.precio_regular,
      precio_oferta: input.precio_oferta ?? null,
      imagen_url: input.imagen_url ? input.imagen_url : null,
    });

    const creado = await productRepository.obtenerPorId(id);
    if (!creado) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar el producto creado');
    }

    return { success: true, message: 'Producto creado correctamente', data: creado };
  },

  /** HU008: actualización de ficha técnica y precios. */
  async actualizar(
    id: string,
    input: ActualizarProductoInput
  ): Promise<ApiResponse<ProductoRow>> {
    const actual = await productRepository.obtenerPorId(id);
    if (!actual) {
      return fallo('RESOURCE_NOT_FOUND', 'El producto con el ID especificado no existe');
    }

    // CA02: precios positivos (validado por Zod) y oferta < regular con valores resultantes
    const regular = input.precio_regular ?? actual.precio_regular;
    const oferta = input.precio_oferta !== undefined ? input.precio_oferta : actual.precio_oferta;
    if (oferta !== null && oferta >= regular) {
      return fallo('INVALID_PRICE', 'El precio de oferta debe ser menor que el precio regular');
    }

    if (input.categoria_id !== undefined && !(await productRepository.existeCategoria(input.categoria_id))) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
    }

    await productRepository.actualizar(id, {
      categoria_id: input.categoria_id,
      nombre: input.nombre,
      descripcion: input.descripcion,
      precio_regular: input.precio_regular,
      precio_oferta: input.precio_oferta,
      imagen_url:
        input.imagen_url !== undefined ? (input.imagen_url ? input.imagen_url : null) : undefined,
    });

    const actualizado = await productRepository.obtenerPorId(id);
    if (!actualizado) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar el producto actualizado');
    }

    return { success: true, message: 'Producto actualizado correctamente', data: actualizado };
  },
};
