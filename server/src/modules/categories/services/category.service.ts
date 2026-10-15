import {
  categoryRepository,
  AtributosValores,
  CategoriaArbolRow,
  CategoriaRow,
} from '../repositories/category.repository';
import {
  ActualizarCategoriaInput,
  CrearCategoriaInput,
  ListarCategoriasQuery,
} from '../schemas/category.schemas';
import { slugify } from '../../../shared/utils/slugify';
import {
  resolverAtributosEfectivos,
  resolverValoresSugeridos,
} from '../../../shared/utils/atributosEfectivos';
import {
  atributoRepository,
  AtributoRow,
} from '../../atributos/repositories/atributo.repository';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

/** Categoría + atributos/valores efectivos para el formulario de productos. */
export interface CategoriaConAtributos extends CategoriaRow {
  atributos_sugeridos: string[];
  valores_sugeridos: AtributosValores;
}

/** Atributo efectivo de una categoría con sus valores del maestro (HU035). */
export interface AtributoCategoriaItem {
  codigo: string;
  nombre: string;
  tipo: AtributoRow['tipo'];
  unidad: string | null;
  valores: Array<{ valor: string; slug: string; hex: string | null }>;
}

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

interface CadenasCategoria {
  permitidos: Array<string[] | null>;
  valores: Array<AtributosValores | null>;
}

/** Cadenas (permitidos y valores) desde la categoría hacia sus ancestros. */
function cadenasDeCategoria(
  categoria: CategoriaRow,
  mapa: Map<number, CategoriaArbolRow>
): CadenasCategoria {
  const permitidos: Array<string[] | null> = [categoria.atributos_permitidos];
  const valores: Array<AtributosValores | null> = [categoria.atributos_valores];
  const visitados = new Set<number>([categoria.id]);
  let padreId = categoria.categoria_padre_id;
  while (padreId !== null && !visitados.has(padreId)) {
    visitados.add(padreId);
    const padre = mapa.get(padreId);
    if (!padre) break;
    permitidos.push(padre.atributos_permitidos);
    valores.push(padre.atributos_valores);
    padreId = padre.categoria_padre_id;
  }
  return { permitidos, valores };
}

function conAtributosResueltos(
  categoria: CategoriaRow,
  mapa: Map<number, CategoriaArbolRow>
): CategoriaConAtributos {
  const cadenas = cadenasDeCategoria(categoria, mapa);
  return {
    ...categoria,
    atributos_sugeridos: resolverAtributosEfectivos(cadenas.permitidos, categoria.nombre),
    valores_sugeridos: resolverValoresSugeridos(cadenas.valores),
  };
}

/** Resuelve los efectivos de una sola categoría (consultando ancestros). */
async function conAtributos(categoria: CategoriaRow): Promise<CategoriaConAtributos> {
  const cadena = await categoryRepository.obtenerCadenaAtributos(categoria.id);
  const permitidos = cadena ? cadena.cadenas : [categoria.atributos_permitidos];
  const valores = cadena ? cadena.cadenasValores : [categoria.atributos_valores];
  return {
    ...categoria,
    atributos_sugeridos: resolverAtributosEfectivos(permitidos, categoria.nombre),
    valores_sugeridos: resolverValoresSugeridos(valores),
  };
}

export const categoryService = {
  /** HU006/HU029/HU030: listado con atributos y valores efectivos (herencia). */
  async listar(filtros: ListarCategoriasQuery): Promise<ApiResponse<CategoriaConAtributos[]>> {
    const filas = await categoryRepository.listar(filtros);
    const arbol = await categoryRepository.obtenerArbolCategorias();
    const mapa = new Map(arbol.map((c) => [c.id, c]));
    const categorias = filas.map((fila) => conAtributosResueltos(fila, mapa));
    return { success: true, message: 'Categorías obtenidas correctamente', data: categorias };
  },

  /** HU006 CA01-CA03: creación con slug normalizado, único y padre opcional. */
  async crear(input: CrearCategoriaInput): Promise<ApiResponse<CategoriaConAtributos>> {
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

    const padreId = input.categoria_padre_id ?? null;
    if (padreId !== null && !(await categoryRepository.obtenerPorId(padreId))) {
      return fallo('PARENT_NOT_FOUND', 'La categoría padre seleccionada no existe');
    }

    const id = await categoryRepository.crear({
      nombre: input.nombre,
      slug,
      descripcion: input.descripcion ? input.descripcion : null,
      categoria_padre_id: padreId,
      atributos_permitidos: input.atributos_permitidos ?? null,
      atributos_valores: input.atributos_valores ?? null,
      sku_prefijo: input.sku_prefijo ?? null,
      sku_segmentos: input.sku_segmentos ?? null,
    });
    const creada = await categoryRepository.obtenerPorId(id);
    if (!creada) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar la categoría creada');
    }

    if (input.atributos_permitidos != null) {
      await categoryRepository.sincronizarAtributosCategoria(id, input.atributos_permitidos);
    }

    return { success: true, message: 'Categoría creada correctamente', data: await conAtributos(creada) };
  },

  /** HU006/HU029/HU030: actualización de datos, estado, padre y atributos/valores. */
  async actualizar(
    id: number,
    input: ActualizarCategoriaInput
  ): Promise<ApiResponse<CategoriaConAtributos>> {
    const actual = await categoryRepository.obtenerPorId(id);
    if (!actual) {
      return fallo('RESOURCE_NOT_FOUND', 'La categoría con el ID especificado no existe');
    }

    let slug: string | undefined;
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

    // Jerarquía: validar existencia del padre y evitar ciclos (no ser su propio ancestro).
    if (input.categoria_padre_id !== undefined && input.categoria_padre_id !== null) {
      const padreId = input.categoria_padre_id;
      if (padreId === id) {
        return fallo('INVALID_PARENT', 'Una categoría no puede ser su propia categoría padre');
      }
      if (!(await categoryRepository.obtenerPorId(padreId))) {
        return fallo('PARENT_NOT_FOUND', 'La categoría padre seleccionada no existe');
      }
      const descendientes = await categoryRepository.obtenerDescendientes(id);
      if (descendientes.includes(padreId)) {
        return fallo(
          'INVALID_PARENT',
          'No se puede asignar como padre una categoría que depende de esta'
        );
      }
    }

    await categoryRepository.actualizar(id, {
      nombre: input.nombre,
      slug,
      descripcion: input.descripcion,
      activo: input.activo,
      categoria_padre_id: input.categoria_padre_id,
      atributos_permitidos: input.atributos_permitidos,
      atributos_valores: input.atributos_valores,
      sku_prefijo: input.sku_prefijo,
      sku_segmentos: input.sku_segmentos,
    });

    const actualizada = await categoryRepository.obtenerPorId(id);
    if (!actualizada) {
      return fallo('INTERNAL_ERROR', 'No se pudo recuperar la categoría actualizada');
    }

    if (input.atributos_permitidos !== undefined) {
      await categoryRepository.sincronizarAtributosCategoria(id, input.atributos_permitidos ?? []);
    }

    return {
      success: true,
      message: 'Categoría actualizada correctamente',
      data: await conAtributos(actualizada),
    };
  },

  /** HU006 CA04: bloquea el borrado físico si la categoría tiene productos o subcategorías. */
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

    if (await categoryRepository.tieneHijos(id)) {
      return fallo(
        'CATEGORY_HAS_SUBCATEGORIES',
        'No se puede eliminar una categoría con subcategorías. Elimina o mueve primero las subcategorías.'
      );
    }

    await categoryRepository.eliminar(id);
    return { success: true, message: 'Categoría eliminada correctamente', data: { id } };
  },

  /** Reordena categorías hermanas (mismo padre) según la posición enviada. */
  async reordenar(ids: number[]): Promise<ApiResponse<{ ids: number[] }>> {
    await categoryRepository.reordenar(ids);
    return { success: true, message: 'Orden actualizado correctamente', data: { ids } };
  },

  /**
   * HU035: atributos efectivos de la categoría (con herencia, HU029) junto con
   * sus valores del maestro, para habilitar los ejes de variante del producto.
   */
  async obtenerAtributos(id: number): Promise<ApiResponse<AtributoCategoriaItem[]>> {
    const cadena = await categoryRepository.obtenerCadenaAtributos(id);
    if (!cadena) {
      return fallo('RESOURCE_NOT_FOUND', 'La categoría con el ID especificado no existe');
    }
    const codigos = resolverAtributosEfectivos(cadena.cadenas, cadena.nombre);
    const [atributos, valores] = await Promise.all([
      atributoRepository.listarAtributos(),
      atributoRepository.listarValores(),
    ]);
    const porCodigo = new Map(atributos.map((a) => [a.codigo, a]));

    const data: AtributoCategoriaItem[] = codigos
      .map((codigo) => porCodigo.get(codigo))
      .filter((a): a is AtributoRow => Boolean(a))
      .map((a) => ({
        codigo: a.codigo,
        nombre: a.nombre,
        tipo: a.tipo,
        unidad: a.unidad,
        valores: valores
          .filter((v) => v.atributo_id === a.id && v.activo)
          .map((v) => ({ valor: v.valor, slug: v.slug, hex: v.hex })),
      }));

    return { success: true, message: 'Atributos de la categoría obtenidos correctamente', data };
  },
};
