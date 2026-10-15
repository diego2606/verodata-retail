import {
  atributoRepository,
  AtributoRow,
  AtributoValorRow,
} from '../repositories/atributo.repository';
import {
  ActualizarAtributoInput,
  ActualizarValorInput,
  CrearAtributoInput,
  CrearValorInput,
} from '../schemas/atributo.schemas';
import { slugify } from '../../../shared/utils/slugify';
import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';

export interface ValorConUso extends AtributoValorRow {
  usos: number;
}

export interface AtributoConValores extends AtributoRow {
  valores: ValorConUso[];
}

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** Código del atributo derivado del nombre: "Talla Calzado" → "TALLA_CALZADO". */
function codigoDesdeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

async function conValores(atributo: AtributoRow): Promise<AtributoConValores> {
  const [valores, usos] = await Promise.all([
    atributoRepository.listarValores(),
    atributoRepository.contarUsoValores(),
  ]);
  const usoMap = new Map(usos.map((u) => [`${u.codigo}::${u.valor}`, u.usos]));
  const propios = valores
    .filter((v) => v.atributo_id === atributo.id)
    .map((v) => ({ ...v, usos: usoMap.get(`${atributo.codigo}::${v.valor.toLowerCase()}`) ?? 0 }));
  return { ...atributo, valores: propios };
}

export const atributoService = {
  /** Lista el maestro completo: atributos con sus valores y conteo de uso. */
  async listar(): Promise<ApiResponse<AtributoConValores[]>> {
    const [atributos, valores, usos] = await Promise.all([
      atributoRepository.listarAtributos(),
      atributoRepository.listarValores(),
      atributoRepository.contarUsoValores(),
    ]);
    const usoMap = new Map(usos.map((u) => [`${u.codigo}::${u.valor}`, u.usos]));
    const data = atributos.map((a) => ({
      ...a,
      valores: valores
        .filter((v) => v.atributo_id === a.id)
        .map((v) => ({ ...v, usos: usoMap.get(`${a.codigo}::${v.valor.toLowerCase()}`) ?? 0 })),
    }));
    return { success: true, message: 'Atributos obtenidos correctamente', data };
  },

  async crear(input: CrearAtributoInput): Promise<ApiResponse<AtributoConValores>> {
    const codigo = input.codigo ?? codigoDesdeNombre(input.nombre);
    if (!codigo) return fallo('INVALID_CODE', 'No se pudo derivar un código válido');
    if (await atributoRepository.existeCodigo(codigo)) {
      return fallo('CODE_ALREADY_EXISTS', 'Ya existe un atributo con ese código');
    }
    const id = await atributoRepository.crearAtributo({ ...input, codigo });
    const creado = await atributoRepository.obtenerAtributo(id);
    if (!creado) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el atributo');
    return { success: true, message: 'Atributo creado correctamente', data: await conValores(creado) };
  },

  async actualizar(id: number, input: ActualizarAtributoInput): Promise<ApiResponse<AtributoConValores>> {
    const actual = await atributoRepository.obtenerAtributo(id);
    if (!actual) return fallo('RESOURCE_NOT_FOUND', 'El atributo no existe');
    await atributoRepository.actualizarAtributo(id, input);
    const actualizado = await atributoRepository.obtenerAtributo(id);
    if (!actualizado) return fallo('INTERNAL_ERROR', 'No se pudo recuperar el atributo');
    return { success: true, message: 'Atributo actualizado correctamente', data: await conValores(actualizado) };
  },

  async eliminar(id: number): Promise<ApiResponse<{ id: number }>> {
    const actual = await atributoRepository.obtenerAtributo(id);
    if (!actual) return fallo('RESOURCE_NOT_FOUND', 'El atributo no existe');

    const valores = (await atributoRepository.listarValores()).filter((v) => v.atributo_id === id);
    for (const v of valores) {
      const usos = await atributoRepository.contarUsoDeValor(actual.codigo, v.valor);
      if (usos > 0) {
        return fallo(
          'ATTRIBUTE_IN_USE',
          `No se puede eliminar: el valor "${v.valor}" está en uso por ${usos} producto(s). Desactívalo en su lugar.`
        );
      }
    }

    await atributoRepository.eliminarAtributo(id);
    return { success: true, message: 'Atributo eliminado correctamente', data: { id } };
  },

  async crearValor(atributoId: number, input: CrearValorInput): Promise<ApiResponse<AtributoConValores>> {
    const atributo = await atributoRepository.obtenerAtributo(atributoId);
    if (!atributo) return fallo('RESOURCE_NOT_FOUND', 'El atributo no existe');

    if (atributo.tipo === 'COLOR' && !input.hex) {
      return fallo('HEX_REQUIRED', 'Los valores de tipo Color requieren un hex (ej. #FF0000)');
    }
    const slug = slugify(input.valor);
    if (!slug) return fallo('INVALID_SLUG', 'No se pudo generar un slug válido');
    if (await atributoRepository.existeValorSlug(atributoId, slug)) {
      return fallo('VALUE_ALREADY_EXISTS', 'Ese valor ya existe para este atributo');
    }

    await atributoRepository.crearValor(atributoId, { ...input, slug });
    return { success: true, message: 'Valor creado correctamente', data: await conValores(atributo) };
  },

  async actualizarValor(valorId: number, input: ActualizarValorInput): Promise<ApiResponse<AtributoConValores>> {
    const valor = await atributoRepository.obtenerValor(valorId);
    if (!valor) return fallo('RESOURCE_NOT_FOUND', 'El valor no existe');
    const atributo = await atributoRepository.obtenerAtributo(valor.atributo_id);
    if (!atributo) return fallo('RESOURCE_NOT_FOUND', 'El atributo no existe');

    const cambiaNombre = input.valor !== undefined && input.valor !== valor.valor;
    let slug: string | undefined;
    if (cambiaNombre) {
      slug = slugify(input.valor as string);
      if (!slug) return fallo('INVALID_SLUG', 'No se pudo generar un slug válido');
      if (await atributoRepository.existeValorSlug(valor.atributo_id, slug, valorId)) {
        return fallo('VALUE_ALREADY_EXISTS', 'Ya existe otro valor con ese nombre');
      }
    }

    // Propaga el renombre a los productos que lo usan (fuente de verdad del texto en JSONB).
    if (cambiaNombre) {
      try {
        await atributoRepository.propagarRenombreValor(atributo.codigo, valor.valor, input.valor as string);
      } catch (error) {
        const code = error as { code?: string };
        if (code?.code === '23505') {
          return fallo(
            'VARIANT_CONFLICT',
            'Renombrar generaría una variante duplicada (modelo + atributos). Revisa los productos afectados.'
          );
        }
        throw error;
      }
    }

    await atributoRepository.actualizarValor(valorId, { ...input, slug });
    return { success: true, message: 'Valor actualizado correctamente', data: await conValores(atributo) };
  },

  async eliminarValor(valorId: number): Promise<ApiResponse<{ id: number }>> {
    const valor = await atributoRepository.obtenerValor(valorId);
    if (!valor) return fallo('RESOURCE_NOT_FOUND', 'El valor no existe');
    const atributo = await atributoRepository.obtenerAtributo(valor.atributo_id);
    if (!atributo) return fallo('RESOURCE_NOT_FOUND', 'El atributo no existe');

    const usos = await atributoRepository.contarUsoDeValor(atributo.codigo, valor.valor);
    if (usos > 0) {
      return fallo(
        'VALUE_IN_USE',
        `No se puede eliminar "${valor.valor}": lo usan ${usos} producto(s). Desactívalo en su lugar.`
      );
    }

    await atributoRepository.eliminarValor(valorId);
    return { success: true, message: 'Valor eliminado correctamente', data: { id: valorId } };
  },
};
