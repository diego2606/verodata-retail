import pool from '../../../config/db';
import { EstadoReposicion, ListarReposicionesQuery } from '../schemas/reposicion.schemas';
import {
  OrdenNoEncontradaError,
  OrdenNoPendienteError,
  ProductoSinInventarioError,
} from '../services/reposicion.errors';

export interface ReposicionRow {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  estado: EstadoReposicion;
  fecha_emision: Date;
  /** DATE sin hora → se devuelve como 'YYYY-MM-DD'. */
  fecha_estimada_arribo: string | null;
  notas: string | null;
  costo_total: number;
  unidades_totales: number;
  usuario_id: string | null;
  motivo_cancelacion: string | null;
  recibido_en: Date | null;
  creado_en: Date;
  actualizado_en: Date;
}

export interface DetalleReposicionRow {
  id: string;
  producto_id: string;
  sku: string;
  producto_nombre: string;
  atributos: Record<string, string>;
  costo_unitario: number;
  cantidad_pedida: number;
  subtotal: number;
}

export interface DetallePreparado {
  producto_id: string;
  costo_unitario: number;
  cantidad_pedida: number;
}

export interface CrearOrdenData {
  proveedor_id: string;
  fecha_estimada_arribo: string | null;
  notas: string | null;
  costo_total: number;
  unidades_totales: number;
  usuario_id: string | null;
  detalles: DetallePreparado[];
}

export interface ResumenRecepcion {
  lineas_actualizadas: number;
  unidades_ingresadas: number;
}

/** NUMERIC se lee como string en `pg`; se castea a float8 en SQL. */
const SELECT_ORDEN = `
  SELECT
    o.id, o.proveedor_id, pr.nombre_empresa AS proveedor_nombre, o.estado,
    o.fecha_emision, o.fecha_estimada_arribo::text AS fecha_estimada_arribo,
    o.notas, o.costo_total::float8 AS costo_total, o.unidades_totales,
    o.usuario_id, o.motivo_cancelacion, o.recibido_en, o.creado_en, o.actualizado_en
  FROM ordenes_reposicion o
  INNER JOIN proveedores pr ON pr.id = o.proveedor_id
`;

const SELECT_DETALLE = `
  SELECT
    d.id, d.producto_id, p.sku, p.nombre AS producto_nombre, p.atributos,
    d.costo_unitario::float8 AS costo_unitario,
    d.cantidad_pedida, d.subtotal::float8 AS subtotal
  FROM detalle_reposicion d
  INNER JOIN productos p ON p.id = d.producto_id
`;

/** Construye el WHERE compartido entre la página y el conteo total. */
function construirFiltro(filtros: ListarReposicionesQuery): {
  where: string;
  valores: unknown[];
} {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  let indice = 1;

  if (filtros.estado) {
    condiciones.push(`o.estado = $${indice++}::estado_reposicion_enum`);
    valores.push(filtros.estado);
  }
  if (filtros.proveedor_id) {
    condiciones.push(`o.proveedor_id = $${indice++}`);
    valores.push(filtros.proveedor_id);
  }

  return {
    where: condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '',
    valores,
  };
}

export const reposicionRepository = {
  /** Historial paginado con el nombre del proveedor; devuelve también el total de filas. */
  async listar(filtros: ListarReposicionesQuery): Promise<{ items: ReposicionRow[]; total: number }> {
    const { where, valores } = construirFiltro(filtros);
    const offset = (filtros.page - 1) * filtros.limit;

    const items = await pool.query<ReposicionRow>(
      `${SELECT_ORDEN} ${where} ORDER BY o.fecha_emision DESC, o.creado_en DESC LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      [...valores, filtros.limit, offset]
    );

    const conteo = await pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM ordenes_reposicion o ${where}`,
      valores
    );

    return { items: items.rows, total: Number(conteo.rows[0].total) };
  },

  async obtenerPorId(id: string): Promise<ReposicionRow | null> {
    const result = await pool.query<ReposicionRow>(`${SELECT_ORDEN} WHERE o.id = $1 LIMIT 1`, [id]);
    return result.rows[0] ?? null;
  },

  async listarDetalle(ordenId: string): Promise<DetalleReposicionRow[]> {
    const result = await pool.query<DetalleReposicionRow>(
      `${SELECT_DETALLE} WHERE d.orden_id = $1 ORDER BY p.sku ASC`,
      [ordenId]
    );
    return result.rows;
  },

  /** Devuelve los ids recibidos que no existen en `productos`. */
  async listarProductosFaltantes(ids: string[]): Promise<string[]> {
    const result = await pool.query<{ id: string }>(
      `SELECT id FROM productos WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    const encontrados = new Set(result.rows.map((fila) => fila.id));
    return ids.filter((id) => !encontrados.has(id));
  },

  /**
   * Crea la cabecera y su detalle en una única transacción (HU036 CA02).
   * Los acumulados (`costo_total`, `unidades_totales`) llegan ya calculados.
   */
  async crear(datos: CrearOrdenData): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orden = await client.query<{ id: string }>(
        `INSERT INTO ordenes_reposicion
           (proveedor_id, fecha_estimada_arribo, notas, costo_total, unidades_totales, usuario_id)
         VALUES ($1, $2::date, $3, $4, $5, $6)
         RETURNING id`,
        [
          datos.proveedor_id,
          datos.fecha_estimada_arribo,
          datos.notas,
          datos.costo_total,
          datos.unidades_totales,
          datos.usuario_id,
        ]
      );

      const ordenId = orden.rows[0].id;
      for (const linea of datos.detalles) {
        await client.query(
          `INSERT INTO detalle_reposicion (orden_id, producto_id, costo_unitario, cantidad_pedida)
           VALUES ($1, $2, $3, $4)`,
          [ordenId, linea.producto_id, linea.costo_unitario, linea.cantidad_pedida]
        );
      }

      await client.query('COMMIT');
      return ordenId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Recepción de mercadería (HU036 CA05): suma el stock de cada línea y registra
   * el movimiento de kardex, todo en una transacción.
   *
   * `SELECT ... FOR UPDATE` sobre la orden serializa dos recepciones simultáneas
   * (evita sumar el stock dos veces); el índice y el estado son la barrera final.
   */
  async recibir(ordenId: string, usuarioId: string | null): Promise<ResumenRecepcion> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cabecera = await client.query<{ estado: EstadoReposicion }>(
        `SELECT estado FROM ordenes_reposicion WHERE id = $1 FOR UPDATE`,
        [ordenId]
      );
      if (cabecera.rows.length === 0) throw new OrdenNoEncontradaError(ordenId);

      const estado = cabecera.rows[0].estado;
      if (estado !== 'PENDIENTE') throw new OrdenNoPendienteError(estado);

      const lineas = await client.query<{ producto_id: string; cantidad_pedida: number }>(
        `SELECT producto_id, cantidad_pedida
           FROM detalle_reposicion
          WHERE orden_id = $1
          ORDER BY producto_id ASC`,
        [ordenId]
      );

      let unidades = 0;
      for (const linea of lineas.rows) {
        const stock = await client.query<{ stock_actual: number }>(
          `UPDATE inventario
              SET stock_actual = stock_actual + $2,
                  actualizado_en = NOW()
            WHERE producto_id = $1
            RETURNING stock_actual`,
          [linea.producto_id, linea.cantidad_pedida]
        );
        if ((stock.rowCount ?? 0) === 0) throw new ProductoSinInventarioError(linea.producto_id);

        await client.query(
          `INSERT INTO movimientos_inventario
             (producto_id, tipo, cantidad, stock_resultante, referencia_tipo, referencia_id, usuario_id)
           VALUES ($1, 'ENTRADA_REPOSICION', $2, $3, 'ORDEN_REPOSICION', $4, $5)`,
          [linea.producto_id, linea.cantidad_pedida, stock.rows[0].stock_actual, ordenId, usuarioId]
        );

        unidades += linea.cantidad_pedida;
      }

      await client.query(
        `UPDATE ordenes_reposicion
            SET estado = 'RECIBIDO', recibido_en = NOW(), actualizado_en = NOW()
          WHERE id = $1`,
        [ordenId]
      );

      await client.query('COMMIT');
      return { lineas_actualizadas: lineas.rows.length, unidades_ingresadas: unidades };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /** Cancela una orden `PENDIENTE` (el stock no se toca). Devuelve false si no aplica. */
  async cancelar(ordenId: string, motivo: string | null): Promise<boolean> {
    const result = await pool.query(
      `UPDATE ordenes_reposicion
          SET estado = 'CANCELADO',
              motivo_cancelacion = $2,
              actualizado_en = NOW()
        WHERE id = $1 AND estado = 'PENDIENTE'`,
      [ordenId, motivo]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
