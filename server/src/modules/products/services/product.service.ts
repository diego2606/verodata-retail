import {
  productRepository,
  ProductoRow,
  ProductoImagenRow,
  CrearProductoData,
} from '../repositories/product.repository';
import {
  ActualizarImagenInput,
  ActualizarProductoInput,
  AgregarImagenInput,
  ATRIBUTOS_VARIANTE_KEYS,
  CrearProductoInput,
  CrearProductosLoteInput,
  ListarProductosQuery,
} from '../schemas/product.schemas';
import { categoryRepository } from '../../categories/repositories/category.repository';
import { resolverAtributosEfectivos } from '../../../shared/utils/atributosEfectivos';
import { generarSkuEstructurado } from '../../../shared/utils/sku';
import { supabaseConfigurado, subirImagenSupabase } from '../../../shared/utils/supabaseStorage';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/**
 * HU026: normaliza el valor de un atributo de variante a una forma determinista
 * (trim + espacios colapsados + capitalización por palabra) para evitar que
 * "Negro", "negro" y "NEGRO" convivan como variantes distintas.
 */
export function normalizarValorAtributo(valor: string): string {
  return valor
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100)
    .toLowerCase()
    .replace(/(^|\s)(\S)/g, (_match, sep: string, caracter: string) => sep + caracter.toUpperCase());
}

/** Deja solo los atributos de variante conocidos, sin valores vacíos (HU026). */
function normalizarAtributos(input?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;
  for (const key of ATRIBUTOS_VARIANTE_KEYS) {
    const raw = input[key]?.trim();
    if (!raw) continue;
    const value = normalizarValorAtributo(raw);
    if (value) out[key] = value;
  }
  return out;
}

function normalizarModelo(modelo?: string | null): string | null {
  const value = modelo?.trim().replace(/\s+/g, ' ');
  return value ? value.slice(0, 255) : null;
}

/** Construye la fila a persistir a partir de la entrada validada (HU024 incluido). */
function aCrearProductoData(input: CrearProductoInput): CrearProductoData {
  return {
    categoria_id: input.categoria_id,
    sku: (input.sku ?? '').trim().toUpperCase(),
    nombre: input.nombre,
    descripcion: input.descripcion,
    precio_regular: input.precio_regular,
    precio_oferta: input.precio_oferta ?? null,
    imagen_url: input.imagen_url ? input.imagen_url : null,
    modelo: normalizarModelo(input.modelo),
    atributos: normalizarAtributos(input.atributos),
    stock_inicial: input.stock_inicial ?? 0,
    stock_minimo: input.stock_minimo ?? 5,
  };
}

/**
 * HU029: atributos efectivos permitidos para una categoría (con herencia).
 * Devuelve `null` si la categoría no existe.
 */
async function obtenerAtributosPermitidos(categoriaId: number): Promise<string[] | null> {
  const cadena = await categoryRepository.obtenerCadenaAtributos(categoriaId);
  if (!cadena) return null;
  return resolverAtributosEfectivos(cadena.cadenas, cadena.nombre);
}

/** Claves de atributo que no están en el conjunto permitido. */
function atributosInvalidos(atributos: Record<string, string>, permitidos: string[]): string[] {
  const set = new Set(permitidos);
  return Object.keys(atributos).filter((key) => !set.has(key));
}

interface PlantillaSku {
  sku_prefijo: string | null;
  sku_segmentos: string[] | null;
}

/**
 * HU031: resuelve el SKU. Si la categoría tiene plantilla, lo genera a partir
 * de los atributos exigidos (todos menos CATEGORIA) y lo devuelve bloqueado;
 * si no, usa el SKU manual.
 */
function resolverSku(
  plantilla: PlantillaSku,
  atributos: Record<string, string>,
  skuManual: string
): { sku: string } | { faltantes: string[] } | { error: 'SKU_REQUIRED' } {
  const segmentos = plantilla.sku_segmentos ?? [];
  if (segmentos.length > 0) {
    const faltantes = segmentos.filter((token) => token !== 'CATEGORIA' && !atributos[token]);
    if (faltantes.length > 0) return { faltantes };
    const sku = generarSkuEstructurado(segmentos, plantilla.sku_prefijo, atributos);
    if (!sku) return { error: 'SKU_REQUIRED' };
    return { sku };
  }
  if (!skuManual) return { error: 'SKU_REQUIRED' };
  return { sku: skuManual };
}

/** Decodifica un data URL base64 (HU033). */
function parseDataUrl(data: string): { buffer: Buffer; contentType: string; ext: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(data);
  if (!match) return null;
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = (contentType.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  return { buffer, contentType, ext };
}

export const productService = {
  /** HU007: listado del catálogo con filtros (incluye modelo, atributos y stock). */
  async listar(filtros: ListarProductosQuery): Promise<ApiResponse<ProductoRow[]>> {
    const productos = await productRepository.listar(filtros);
    return { success: true, message: 'Productos obtenidos correctamente', data: productos };
  },

  /** HU007/HU031: creación de artículo con SKU (manual o generado) e inventario inicial. */
  async crear(input: CrearProductoInput): Promise<ApiResponse<ProductoRow>> {
    const data = aCrearProductoData(input);

    const plantilla = await categoryRepository.obtenerPlantillaSku(data.categoria_id);
    if (!plantilla) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
    }

    const skuResuelto = resolverSku(plantilla, data.atributos, data.sku);
    if ('faltantes' in skuResuelto) {
      return fallo(
        'MISSING_REQUIRED_ATTRIBUTE',
        `Completa los atributos obligatorios para generar el SKU: ${skuResuelto.faltantes.join(', ')}`,
        { faltantes: skuResuelto.faltantes }
      );
    }
    if ('error' in skuResuelto) {
      return fallo('SKU_REQUIRED', 'El SKU es obligatorio para esta categoría');
    }
    data.sku = skuResuelto.sku;

    if (await productRepository.existeSku(data.sku)) {
      return fallo('SKU_ALREADY_EXISTS', 'Ya existe un producto con ese SKU');
    }

    const permitidos = await obtenerAtributosPermitidos(data.categoria_id);
    if (permitidos === null) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
    }
    const invalidos = atributosInvalidos(data.atributos, permitidos);
    if (invalidos.length > 0) {
      return fallo(
        'INVALID_ATTRIBUTE',
        `Atributos no permitidos para la categoría: ${invalidos.join(', ')}`,
        { atributos: invalidos, permitidos }
      );
    }

    if (data.modelo !== null && (await productRepository.existeVariante(data.modelo, data.atributos))) {
      return fallo(
        'VARIANT_ALREADY_EXISTS',
        'Ya existe una variante de este modelo con los mismos atributos (color/talla/capacidad)'
      );
    }

    const id = await productRepository.crear(data);

    const creado = await productRepository.obtenerPorId(id);
    if (!creado) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar el producto creado');
    }

    return { success: true, message: 'Producto creado correctamente', data: creado };
  },

  /**
   * HU028: alta masiva de variantes. Valida todo el lote (SKU, categoría y
   * combinación modelo+atributos, incluso duplicados dentro del propio lote)
   * antes de persistir de forma transaccional.
   */
  async crearLote(input: CrearProductosLoteInput): Promise<ApiResponse<ProductoRow[]>> {
    const dataList = input.productos.map(aCrearProductoData);

    const skusVistos = new Set<string>();
    const variantesVistas = new Set<string>();
    const permitidosPorCategoria = new Map<number, string[] | null>();
    const plantillaPorCategoria = new Map<number, PlantillaSku | null>();

    for (const data of dataList) {
      if (!plantillaPorCategoria.has(data.categoria_id)) {
        plantillaPorCategoria.set(
          data.categoria_id,
          await categoryRepository.obtenerPlantillaSku(data.categoria_id)
        );
      }
      const plantilla = plantillaPorCategoria.get(data.categoria_id) ?? null;
      if (plantilla === null) {
        return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
      }

      const skuResuelto = resolverSku(plantilla, data.atributos, data.sku);
      if ('faltantes' in skuResuelto) {
        return fallo(
          'MISSING_REQUIRED_ATTRIBUTE',
          `Completa los atributos obligatorios para generar el SKU: ${skuResuelto.faltantes.join(', ')}`,
          { faltantes: skuResuelto.faltantes }
        );
      }
      if ('error' in skuResuelto) {
        return fallo('SKU_REQUIRED', 'El SKU es obligatorio para esta categoría');
      }
      data.sku = skuResuelto.sku;

      if (skusVistos.has(data.sku)) {
        return fallo('SKU_ALREADY_EXISTS', `El SKU ${data.sku} está repetido dentro del lote`);
      }
      skusVistos.add(data.sku);

      if (await productRepository.existeSku(data.sku)) {
        return fallo('SKU_ALREADY_EXISTS', `Ya existe un producto con el SKU ${data.sku}`);
      }

      if (!permitidosPorCategoria.has(data.categoria_id)) {
        permitidosPorCategoria.set(
          data.categoria_id,
          await obtenerAtributosPermitidos(data.categoria_id)
        );
      }
      const permitidos = permitidosPorCategoria.get(data.categoria_id) ?? null;
      if (permitidos === null) {
        return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
      }
      const invalidos = atributosInvalidos(data.atributos, permitidos);
      if (invalidos.length > 0) {
        return fallo(
          'INVALID_ATTRIBUTE',
          `Atributos no permitidos para la categoría: ${invalidos.join(', ')}`,
          { atributos: invalidos, permitidos }
        );
      }

      if (data.modelo !== null) {
        const clave = `${data.modelo}::${JSON.stringify(data.atributos)}`;
        if (variantesVistas.has(clave)) {
          return fallo(
            'VARIANT_ALREADY_EXISTS',
            'El lote contiene dos variantes con el mismo modelo y atributos'
          );
        }
        variantesVistas.add(clave);

        if (await productRepository.existeVariante(data.modelo, data.atributos)) {
          return fallo(
            'VARIANT_ALREADY_EXISTS',
            'Ya existe una variante de este modelo con los mismos atributos (color/talla/capacidad)'
          );
        }
      }
    }

    const ids = await productRepository.crearLote(dataList);
    const creados = await Promise.all(ids.map((id) => productRepository.obtenerPorId(id)));

    return {
      success: true,
      message: `${ids.length} variantes creadas correctamente`,
      data: creados.filter((row): row is ProductoRow => row !== null),
    };
  },

  /** HU008: actualización de ficha técnica y precios. HU009: borrado lógico (activo). */
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

    const categoriaId = input.categoria_id ?? actual.categoria_id;
    const permitidos = await obtenerAtributosPermitidos(categoriaId);
    if (permitidos === null) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
    }

    const modelo = input.modelo !== undefined ? normalizarModelo(input.modelo) : actual.modelo;
    const atributos =
      input.atributos !== undefined ? normalizarAtributos(input.atributos) : actual.atributos;

    if (input.atributos !== undefined) {
      const invalidos = atributosInvalidos(atributos, permitidos);
      if (invalidos.length > 0) {
        return fallo(
          'INVALID_ATTRIBUTE',
          `Atributos no permitidos para la categoría: ${invalidos.join(', ')}`,
          { atributos: invalidos, permitidos }
        );
      }
    }

    // HU031: el SKU es INMUTABLE. Si la categoría tiene plantilla y los atributos
    // cambiados alterarían el SKU, se rechaza (desactivar y crear uno nuevo).
    const plantilla = await categoryRepository.obtenerPlantillaSku(categoriaId);
    if (!plantilla) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
    }
    const skuResuelto = resolverSku(plantilla, atributos, actual.sku);
    if ('faltantes' in skuResuelto) {
      return fallo(
        'MISSING_REQUIRED_ATTRIBUTE',
        `Completa los atributos obligatorios para generar el SKU: ${skuResuelto.faltantes.join(', ')}`,
        { faltantes: skuResuelto.faltantes }
      );
    }
    if ('error' in skuResuelto) {
      return fallo('SKU_REQUIRED', 'El SKU es obligatorio para esta categoría');
    }
    if (skuResuelto.sku !== actual.sku) {
      return fallo(
        'SKU_INMUTABLE',
        'El SKU es inmutable. Para cambiar atributos que lo componen (marca, modelo, color…), desactiva el producto y crea uno nuevo.'
      );
    }

    if (modelo !== null && (await productRepository.existeVariante(modelo, atributos, id))) {
      return fallo(
        'VARIANT_ALREADY_EXISTS',
        'Ya existe otra variante de este modelo con los mismos atributos (color/talla/capacidad)'
      );
    }

    await productRepository.actualizar(id, {
      categoria_id: input.categoria_id,
      nombre: input.nombre,
      descripcion: input.descripcion,
      precio_regular: input.precio_regular,
      precio_oferta: input.precio_oferta,
      imagen_url:
        input.imagen_url !== undefined ? (input.imagen_url ? input.imagen_url : null) : undefined,
      modelo: input.modelo !== undefined ? modelo : undefined,
      atributos: input.atributos !== undefined ? atributos : undefined,
      activo: input.activo,
    });

    const actualizado = await productRepository.obtenerPorId(id);
    if (!actualizado) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar el producto actualizado');
    }

    const message =
      input.activo === false
        ? 'Producto desactivado correctamente'
        : input.activo === true
          ? 'Producto activado correctamente'
          : 'Producto actualizado correctamente';

    return { success: true, message, data: actualizado };
  },

  // ── HU033: galería de imágenes ──────────────────────────────────────────────

  async listarImagenes(productoId: string): Promise<ApiResponse<ProductoImagenRow[]>> {
    const producto = await productRepository.obtenerPorId(productoId);
    if (!producto) {
      return fallo('RESOURCE_NOT_FOUND', 'El producto con el ID especificado no existe');
    }
    const imagenes = await productRepository.listarImagenes(productoId);
    return { success: true, message: 'Imágenes obtenidas correctamente', data: imagenes };
  },

  /** Agrega una imagen por URL o subiendo un archivo (base64) a Supabase Storage. */
  async agregarImagen(
    productoId: string,
    input: AgregarImagenInput
  ): Promise<ApiResponse<ProductoImagenRow>> {
    const producto = await productRepository.obtenerPorId(productoId);
    if (!producto) {
      return fallo('RESOURCE_NOT_FOUND', 'El producto con el ID especificado no existe');
    }

    let url = input.url ?? '';
    if (!url && input.data) {
      if (!supabaseConfigurado()) {
        return fallo(
          'STORAGE_NOT_CONFIGURED',
          'La subida de archivos no está configurada. Pega una URL de imagen.'
        );
      }
      const parsed = parseDataUrl(input.data);
      if (!parsed) return fallo('INVALID_FILE', 'El archivo enviado no es válido');
      try {
        const nombre = `${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${parsed.ext}`;
        url = await subirImagenSupabase(parsed.buffer, parsed.contentType, nombre);
      } catch (error) {
        return fallo(
          'STORAGE_ERROR',
          error instanceof Error ? error.message : 'No se pudo subir la imagen'
        );
      }
    }
    if (!url) return fallo('INVALID_URL', 'Debes indicar una URL o un archivo');

    const imagen = await productRepository.crearImagen(productoId, {
      url,
      alt: input.alt ?? null,
      esPrincipal: input.es_principal ?? false,
    });
    return { success: true, message: 'Imagen agregada correctamente', data: imagen };
  },

  async marcarImagenPrincipal(
    productoId: string,
    imagenId: string
  ): Promise<ApiResponse<{ id: string }>> {
    const ok = await productRepository.marcarImagenPrincipal(productoId, imagenId);
    if (!ok) return fallo('RESOURCE_NOT_FOUND', 'La imagen no existe para este producto');
    return { success: true, message: 'Imagen principal actualizada', data: { id: imagenId } };
  },

  async actualizarImagen(
    productoId: string,
    imagenId: string,
    input: ActualizarImagenInput
  ): Promise<ApiResponse<ProductoImagenRow>> {
    const imagen = await productRepository.obtenerImagen(imagenId);
    if (!imagen || imagen.producto_id !== productoId) {
      return fallo('RESOURCE_NOT_FOUND', 'La imagen no existe para este producto');
    }
    await productRepository.actualizarImagen(imagenId, { alt: input.alt, orden: input.orden });
    const actualizada = await productRepository.obtenerImagen(imagenId);
    if (!actualizada) return fallo('INTERNAL_ERROR', 'No se pudo recuperar la imagen');
    return { success: true, message: 'Imagen actualizada correctamente', data: actualizada };
  },

  async eliminarImagen(
    productoId: string,
    imagenId: string
  ): Promise<ApiResponse<{ id: string }>> {
    const ok = await productRepository.eliminarImagen(productoId, imagenId);
    if (!ok) return fallo('RESOURCE_NOT_FOUND', 'La imagen no existe para este producto');
    return { success: true, message: 'Imagen eliminada correctamente', data: { id: imagenId } };
  },
};
