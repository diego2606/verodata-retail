import {
  CrearModeloData,
  productModelRepository,
  ProductoModeloRow,
  SkuVarianteRow,
} from '../repositories/product-model.repository';
import {
  ActualizarModeloInput,
  CrearModeloInput,
  DeltaVariantesInput,
  NuevaVarianteInput,
} from '../schemas/product-model.schemas';
import { categoryRepository } from '../../categories/repositories/category.repository';
import {
  productRepository,
  ProductoImagenRow,
} from '../../products/repositories/product.repository';
import {
  ActualizarImagenInput,
  AgregarImagenInput,
} from '../../products/schemas/product.schemas';
import { resolverUrlImagen } from '../../../shared/utils/imagenUpload';
import { resolverAtributosEfectivos } from '../../../shared/utils/atributosEfectivos';
import {
  combinacionCanonica,
  normalizarAtributos,
} from '../../../shared/utils/atributosVariante';
import { generarSkuEstructurado } from '../../../shared/utils/sku';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';
import {
  AtributoFaltanteError,
  AtributoInvalidoError,
  SkuRequeridoError,
  VarianteDuplicadaError,
} from './product-model.errors';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

export interface ModeloConVariantes extends ProductoModeloRow {
  variantes: SkuVarianteRow[];
}

export interface ResumenDelta {
  creadas: number;
  actualizadas: number;
  desactivadas: number;
  variantes: SkuVarianteRow[];
}

interface PlantillaSku {
  sku_prefijo: string | null;
  sku_segmentos: string[] | null;
}

/** Resuelve el SKU de una variante (manual o generado por plantilla, HU031). */
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

function limpiarTexto(valor: string | null | undefined): string | null {
  const t = valor?.trim();
  return t ? t : null;
}

export const productModelService = {
  /** Listado de Productos Padre (Modelos). */
  async listar(): Promise<ApiResponse<ProductoModeloRow[]>> {
    const data = await productModelRepository.listar();
    return { success: true, message: 'Productos obtenidos correctamente', data };
  },

  /** Alta del Producto Padre. Valida que los ejes existan en la categoría (HU035 CA05). */
  async crear(input: CrearModeloInput): Promise<ApiResponse<ProductoModeloRow>> {
    const categoria = await categoryRepository.obtenerPorId(input.categoria_id);
    if (!categoria) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría seleccionada no existe');
    }

    const cadena = await categoryRepository.obtenerCadenaAtributos(input.categoria_id);
    const permitidos = cadena
      ? resolverAtributosEfectivos(cadena.cadenas, cadena.nombre)
      : [];
    const ejes = input.atributos_variantes ?? [];
    const invalidos = ejes.filter((key) => !permitidos.includes(key));
    if (invalidos.length > 0) {
      return fallo(
        'INVALID_ATTRIBUTE',
        `Atributos no permitidos para la categoría: ${invalidos.join(', ')}`,
        { atributos: invalidos, permitidos }
      );
    }

    const data: CrearModeloData = {
      categoria_id: input.categoria_id,
      nombre: input.nombre,
      marca: limpiarTexto(input.marca),
      modelo_codigo: limpiarTexto(input.modelo_codigo),
      descripcion: limpiarTexto(input.descripcion),
      atributos_variantes: ejes,
    };

    const id = await productModelRepository.crear(data);
    const creado = await productModelRepository.obtenerPorId(id);
    if (!creado) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el producto creado');
    return { success: true, message: 'Producto creado correctamente', data: creado };
  },

  /** Ficha completa: modelo + sus SKUs hijos. */
  async obtener(id: string): Promise<ApiResponse<ModeloConVariantes>> {
    const modelo = await productModelRepository.obtenerPorId(id);
    if (!modelo) return fallo('MODEL_NOT_FOUND', 'El producto no existe');
    const variantes = await productModelRepository.listarVariantes(id);
    return { success: true, message: 'Producto obtenido correctamente', data: { ...modelo, variantes } };
  },

  /** Resuelve la ficha desde el ID de un SKU (para abrir el editor desde el listado). */
  async obtenerPorSku(skuId: string): Promise<ApiResponse<ModeloConVariantes>> {
    const modeloId = await productModelRepository.obtenerModeloIdPorSku(skuId);
    if (!modeloId) {
      return fallo('MODEL_NOT_FOUND', 'El producto no tiene un modelo asociado');
    }
    return productModelService.obtener(modeloId);
  },

  /** Actualización de los datos comunes del padre. */
  async actualizar(
    id: string,
    input: ActualizarModeloInput
  ): Promise<ApiResponse<ProductoModeloRow>> {
    const actual = await productModelRepository.obtenerPorId(id);
    if (!actual) return fallo('MODEL_NOT_FOUND', 'El producto no existe');

    if (input.atributos_variantes !== undefined) {
      const categoriaId = input.categoria_id ?? actual.categoria_id;
      const cadena = await categoryRepository.obtenerCadenaAtributos(categoriaId);
      const permitidos = cadena ? resolverAtributosEfectivos(cadena.cadenas, cadena.nombre) : [];
      const invalidos = input.atributos_variantes.filter((key) => !permitidos.includes(key));
      if (invalidos.length > 0) {
        return fallo(
          'INVALID_ATTRIBUTE',
          `Atributos no permitidos para la categoría: ${invalidos.join(', ')}`,
          { atributos: invalidos, permitidos }
        );
      }
    }

    await productModelRepository.actualizar(id, {
      categoria_id: input.categoria_id,
      nombre: input.nombre,
      marca: input.marca !== undefined ? limpiarTexto(input.marca) : undefined,
      modelo_codigo: input.modelo_codigo !== undefined ? limpiarTexto(input.modelo_codigo) : undefined,
      descripcion: input.descripcion !== undefined ? limpiarTexto(input.descripcion) : undefined,
      atributos_variantes: input.atributos_variantes,
      activo: input.activo,
    });

    const actualizado = await productModelRepository.obtenerPorId(id);
    if (!actualizado) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el producto actualizado');
    return { success: true, message: 'Producto actualizado correctamente', data: actualizado };
  },

  /**
   * Aplica el delta de variantes en una sola transacción ACID (HU035 CA08).
   * Valida ejes, combinaciones y SKUs antes de abrir la transacción; el índice
   * único de la base de datos es la última barrera contra duplicados.
   */
  async aplicarDelta(
    modeloId: string,
    input: DeltaVariantesInput
  ): Promise<ApiResponse<ResumenDelta>> {
    const modelo = await productModelRepository.obtenerPorId(modeloId);
    if (!modelo) return fallo('MODEL_NOT_FOUND', 'El producto no existe');

    const cadena = await categoryRepository.obtenerCadenaAtributos(modelo.categoria_id);
    if (!cadena) {
      return fallo('CATEGORY_NOT_FOUND', 'La categoría del producto no existe');
    }
    const permitidos = resolverAtributosEfectivos(cadena.cadenas, cadena.nombre);
    const ejes = modelo.atributos_variantes.length > 0 ? modelo.atributos_variantes : permitidos;

    const plantilla = await categoryRepository.obtenerPlantillaSku(modelo.categoria_id);
    if (!plantilla) return fallo('CATEGORY_NOT_FOUND', 'La categoría del producto no existe');

    // 1) Validar el payload y preparar las variantes nuevas
    const variantesPrevias = await productModelRepository.listarVariantes(modeloId);
    const idsExistentes = new Set(variantesPrevias.map((v) => v.id));
    const combinacionesExistentes = new Set(
      variantesPrevias.map((v) => combinacionCanonica(v.atributos))
    );
    const combinacionesNuevas = new Set<string>();
    const skusNuevos = new Set<string>();

    const nuevas = input.nuevas_variantes.map((v) =>
      prepararNuevaVariante(v, {
        ejes,
        permitidos,
        plantilla,
        modelo,
        combinacionesExistentes,
        combinacionesNuevas,
        skusNuevos,
      })
    );

    // 2) Validar pertenencia de actualizaciones y eliminaciones
    for (const a of input.actualizar_variantes) {
      if (!idsExistentes.has(a.sku_id)) {
        return fallo('VARIANT_NOT_FOUND', 'Una variante a actualizar no pertenece a este producto');
      }
    }
    const eliminar = input.eliminar_variantes.filter((id) => idsExistentes.has(id));
    if (eliminar.length !== input.eliminar_variantes.length) {
      return fallo('VARIANT_NOT_FOUND', 'Una variante a eliminar no pertenece a este producto');
    }

    // 3) Verificar SKUs nuevos contra la base (el índice único de la BD es la barrera final)
    for (const v of nuevas) {
      if (await productModelRepository.existeSku(v.sku)) {
        return fallo('SKU_ALREADY_EXISTS', `Ya existe un producto con el SKU ${v.sku}`);
      }
    }

    // 4) Ejecutar la transacción y mapear violaciones de unicidad
    try {
      const resumen = await productModelRepository.aplicarDelta(modeloId, {
        nuevas,
        actualizar: input.actualizar_variantes.map((a) => ({
          sku_id: a.sku_id,
          precio_regular: a.precio_regular,
          reemplazaOferta: 'precio_oferta' in a,
          precio_oferta: a.precio_oferta ?? null,
          codigo_barras: a.codigo_barras,
          activo: a.activo,
          stock_actual: a.stock_actual,
          stock_minimo: a.stock_minimo,
        })),
        eliminar,
      });
      const variantes = await productModelRepository.listarVariantes(modeloId);
      return {
        success: true,
        message: `Variantes actualizadas: ${resumen.creadas} creada(s), ${resumen.actualizadas} actualizada(s), ${resumen.desactivadas} desactivada(s)`,
        data: { ...resumen, variantes },
      };
    } catch (error) {
      return mapearErrorUnicidad(error);
    }
  },

  // ── HU033/HU035: galería de imágenes del Producto Padre ────────────────────

  async listarImagenes(modeloId: string): Promise<ApiResponse<ProductoImagenRow[]>> {
    const modelo = await productModelRepository.obtenerPorId(modeloId);
    if (!modelo) return fallo('MODEL_NOT_FOUND', 'El producto no existe');
    const imagenes = await productRepository.listarImagenes({ columna: 'modelo_id', id: modeloId });
    return { success: true, message: 'Imágenes obtenidas correctamente', data: imagenes };
  },

  async agregarImagen(
    modeloId: string,
    input: AgregarImagenInput
  ): Promise<ApiResponse<ProductoImagenRow>> {
    const modelo = await productModelRepository.obtenerPorId(modeloId);
    if (!modelo) return fallo('MODEL_NOT_FOUND', 'El producto no existe');

    const resuelto = await resolverUrlImagen(input, modeloId);
    if ('error' in resuelto) return fallo(resuelto.error, resuelto.message);

    const imagen = await productRepository.crearImagen(
      { columna: 'modelo_id', id: modeloId },
      { url: resuelto.url, alt: input.alt ?? null, esPrincipal: input.es_principal ?? false }
    );
    return { success: true, message: 'Imagen agregada correctamente', data: imagen };
  },

  async marcarImagenPrincipal(
    modeloId: string,
    imagenId: string
  ): Promise<ApiResponse<{ id: string }>> {
    const ok = await productRepository.marcarImagenPrincipal(
      { columna: 'modelo_id', id: modeloId },
      imagenId
    );
    if (!ok) return fallo('RESOURCE_NOT_FOUND', 'La imagen no existe para este producto');
    return { success: true, message: 'Imagen principal actualizada', data: { id: imagenId } };
  },

  async actualizarImagen(
    modeloId: string,
    imagenId: string,
    input: ActualizarImagenInput
  ): Promise<ApiResponse<ProductoImagenRow>> {
    const imagen = await productRepository.obtenerImagen(imagenId);
    if (!imagen || imagen.modelo_id !== modeloId) {
      return fallo('RESOURCE_NOT_FOUND', 'La imagen no existe para este producto');
    }
    await productRepository.actualizarImagen(imagenId, { alt: input.alt, orden: input.orden });
    const actualizada = await productRepository.obtenerImagen(imagenId);
    if (!actualizada) return fallo('INTERNAL_ERROR', 'No se pudo recuperar la imagen');
    return { success: true, message: 'Imagen actualizada correctamente', data: actualizada };
  },

  async eliminarImagen(
    modeloId: string,
    imagenId: string
  ): Promise<ApiResponse<{ id: string }>> {
    const ok = await productRepository.eliminarImagen(
      { columna: 'modelo_id', id: modeloId },
      imagenId
    );
    if (!ok) return fallo('RESOURCE_NOT_FOUND', 'La imagen no existe para este producto');
    return { success: true, message: 'Imagen eliminada correctamente', data: { id: imagenId } };
  },
};

interface ContextoNuevaVariante {
  ejes: string[];
  permitidos: string[];
  plantilla: PlantillaSku;
  modelo: ProductoModeloRow;
  combinacionesExistentes: Set<string>;
  combinacionesNuevas: Set<string>;
  skusNuevos: Set<string>;
}

/** Valida y normaliza una variante nueva; lanza un error de dominio si es inválida. */
function prepararNuevaVariante(
  variante: NuevaVarianteInput,
  ctx: ContextoNuevaVariante
): {
  sku: string;
  codigo_barras: string | null;
  atributos: Record<string, string>;
  precio_regular: number;
  precio_oferta: number | null;
  stock_actual: number;
  stock_minimo: number;
  categoria_id: number;
  nombre: string;
  descripcion: string | null;
} {
  const clavesPayload = Object.keys(variante.atributos);
  const atributos = normalizarAtributos(variante.atributos, clavesPayload);

  const invalidos = Object.keys(atributos).filter(
    (key) => !ctx.permitidos.includes(key) || !ctx.ejes.includes(key)
  );
  if (invalidos.length > 0) {
    throw new AtributoInvalidoError(invalidos, ctx.ejes);
  }

  const faltantes = ctx.ejes.filter((key) => !atributos[key]);
  if (faltantes.length > 0) {
    throw new AtributoFaltanteError(faltantes);
  }

  const combinacion = combinacionCanonica(atributos);
  if (ctx.combinacionesNuevas.has(combinacion) || ctx.combinacionesExistentes.has(combinacion)) {
    throw new VarianteDuplicadaError(atributos);
  }
  ctx.combinacionesNuevas.add(combinacion);

  // Los tokens BRAND/MODEL del SKU se alimentan desde el modelo.
  const atributosSku: Record<string, string> = { ...atributos };
  if (ctx.modelo.marca) atributosSku.BRAND = ctx.modelo.marca;
  if (ctx.modelo.modelo_codigo) atributosSku.MODEL = ctx.modelo.modelo_codigo;

  const skuManual = (variante.sku ?? '').trim().toUpperCase();
  const resuelto = resolverSku(ctx.plantilla, atributosSku, skuManual);
  if ('faltantes' in resuelto) {
    throw new AtributoFaltanteError(resuelto.faltantes);
  }
  if ('error' in resuelto) {
    throw new SkuRequeridoError();
  }
  if (ctx.skusNuevos.has(resuelto.sku)) {
    throw new VarianteDuplicadaError(atributos);
  }
  ctx.skusNuevos.add(resuelto.sku);

  return {
    sku: resuelto.sku,
    codigo_barras: limpiarTexto(variante.codigo_barras),
    atributos,
    precio_regular: variante.precio_regular,
    precio_oferta: variante.precio_oferta ?? null,
    stock_actual: variante.stock_actual,
    stock_minimo: variante.stock_minimo ?? 5,
    categoria_id: ctx.modelo.categoria_id,
    nombre: ctx.modelo.nombre,
    descripcion: ctx.modelo.descripcion,
  };
}

/** Traduce una violación de unicidad de PostgreSQL (23505) a un fallo de negocio 400/409. */
export function mapearErrorUnicidad(error: unknown): ApiFailure {
  const codigo = (error as { code?: string }).code;
  const constraint = (error as { constraint?: string }).constraint ?? '';
  if (codigo === '23505') {
    if (constraint.includes('combinacion')) {
      return fallo('VARIANT_ALREADY_EXISTS', 'Ya existe esa combinación de atributos para este producto.');
    }
    if (constraint.includes('codigo_barras')) {
      return fallo('BARCODE_ALREADY_EXISTS', 'Ese código de barras ya está registrado.');
    }
    return fallo('SKU_ALREADY_EXISTS', 'Ya existe un producto con ese SKU.');
  }
  throw error;
}
