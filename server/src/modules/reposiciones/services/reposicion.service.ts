import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';
import {
  DetallePreparado,
  DetalleReposicionRow,
  ReposicionRow,
  ResumenRecepcion,
  reposicionRepository,
} from '../repositories/reposicion.repository';
import { proveedorRepository } from '../../proveedores/repositories/proveedor.repository';
import {
  CancelarReposicionInput,
  CrearReposicionInput,
  ListarReposicionesQuery,
} from '../schemas/reposicion.schemas';
import {
  OrdenNoEncontradaError,
  OrdenNoPendienteError,
  ProductoSinInventarioError,
} from './reposicion.errors';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

/** Redondeo a 2 decimales (el dinero nunca se acumula en float sin normalizar). */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function limpiarTexto(valor: string | null | undefined): string | null {
  const t = valor?.trim();
  return t ? t : null;
}

export interface OrdenConDetalle extends ReposicionRow {
  detalles: DetalleReposicionRow[];
}

export interface RecepcionResultado extends ResumenRecepcion {
  id: string;
  estado: 'RECIBIDO';
}

export interface PaginaReposiciones {
  items: ReposicionRow[];
  total: number;
  page: number;
  limit: number;
}

export const reposicionService = {
  /** Historial paginado con el nombre del proveedor (HU036 CA07). */
  async listar(filtros: ListarReposicionesQuery): Promise<ApiResponse<PaginaReposiciones>> {
    const { items, total } = await reposicionRepository.listar(filtros);
    return {
      success: true,
      message: 'Órdenes de reposición obtenidas correctamente',
      data: { items, total, page: filtros.page, limit: filtros.limit },
    };
  },

  /** Detalle completo de una orden (HU036 CA08). */
  async obtener(id: string): Promise<ApiResponse<OrdenConDetalle>> {
    const orden = await reposicionRepository.obtenerPorId(id);
    if (!orden) return fallo('ORDEN_NOT_FOUND', 'La orden de reposición no existe');
    const detalles = await reposicionRepository.listarDetalle(id);
    return { success: true, message: 'Orden obtenida correctamente', data: { ...orden, detalles } };
  },

  /**
   * Crea la orden en estado PENDIENTE calculando los acumulados (HU036 CA02/CA03).
   * El stock NO se altera aquí: eso ocurre solo al confirmar la recepción.
   */
  async crear(
    input: CrearReposicionInput,
    usuarioId: string | null
  ): Promise<ApiResponse<OrdenConDetalle>> {
    const proveedor = await proveedorRepository.obtenerPorId(input.proveedor_id);
    if (!proveedor) {
      return fallo('PROVEEDOR_NOT_FOUND', 'El proveedor seleccionado no existe');
    }

    const faltantes = await reposicionRepository.listarProductosFaltantes(
      input.detalles.map((linea) => linea.producto_id)
    );
    if (faltantes.length > 0) {
      return fallo('PRODUCTO_NOT_FOUND', 'Uno o más productos no existen', { productos: faltantes });
    }

    const detalles: DetallePreparado[] = input.detalles.map((linea) => ({
      producto_id: linea.producto_id,
      costo_unitario: linea.costo_unitario,
      cantidad_pedida: linea.cantidad_pedida,
    }));
    const costoTotal = redondear(
      detalles.reduce((acc, linea) => acc + linea.costo_unitario * linea.cantidad_pedida, 0)
    );
    const unidadesTotales = detalles.reduce((acc, linea) => acc + linea.cantidad_pedida, 0);

    const id = await reposicionRepository.crear({
      proveedor_id: input.proveedor_id,
      fecha_estimada_arribo: input.fecha_estimada_arribo ?? null,
      notas: limpiarTexto(input.notas),
      costo_total: costoTotal,
      unidades_totales: unidadesTotales,
      usuario_id: usuarioId,
      detalles,
    });

    const creada = await reposicionRepository.obtenerPorId(id);
    if (!creada) return fallo('INTERNAL_ERROR', 'No se pudo recuperar la orden creada');

    return {
      success: true,
      message: `Orden de reposición creada con ${unidadesTotales} unidad(es)`,
      data: { ...creada, detalles: await reposicionRepository.listarDetalle(id) },
    };
  },

  /** Recepción atómica: suma stock y registra kardex (HU036 CA04/CA05/CA06). */
  async recibir(id: string, usuarioId: string | null): Promise<ApiResponse<RecepcionResultado>> {
    try {
      const resumen = await reposicionRepository.recibir(id, usuarioId);
      return {
        success: true,
        message: `Recepción confirmada: ${resumen.unidades_ingresadas} unidad(es) sumadas al stock de la tienda`,
        data: { id, estado: 'RECIBIDO', ...resumen },
      };
    } catch (error) {
      if (error instanceof OrdenNoEncontradaError) {
        return fallo('ORDEN_NOT_FOUND', 'La orden de reposición no existe');
      }
      if (error instanceof OrdenNoPendienteError) {
        return fallo(
          'ORDEN_NO_PENDIENTE',
          `La orden está en estado ${error.estado} y ya no puede recibirse`,
          { estado: error.estado }
        );
      }
      if (error instanceof ProductoSinInventarioError) {
        return fallo(
          'PRODUCTO_SIN_INVENTARIO',
          'Uno de los productos de la orden no tiene registro de inventario',
          { producto_id: error.productoId }
        );
      }
      throw error;
    }
  },

  /** Cancela una orden PENDIENTE sin tocar el stock (HU036 CA09). */
  async cancelar(
    id: string,
    input: CancelarReposicionInput
  ): Promise<ApiResponse<ReposicionRow>> {
    const orden = await reposicionRepository.obtenerPorId(id);
    if (!orden) return fallo('ORDEN_NOT_FOUND', 'La orden de reposición no existe');
    if (orden.estado !== 'PENDIENTE') {
      return fallo(
        'ORDEN_NO_PENDIENTE',
        `La orden está en estado ${orden.estado} y no puede cancelarse`,
        { estado: orden.estado }
      );
    }

    const ok = await reposicionRepository.cancelar(id, limpiarTexto(input.motivo));
    if (!ok) {
      return fallo('ORDEN_NO_PENDIENTE', 'La orden cambió de estado; recarga e inténtalo de nuevo');
    }

    const actualizada = await reposicionRepository.obtenerPorId(id);
    if (!actualizada) return fallo('INTERNAL_ERROR', 'No se pudo recuperar la orden cancelada');
    return { success: true, message: 'Orden cancelada correctamente', data: actualizada };
  },
};
