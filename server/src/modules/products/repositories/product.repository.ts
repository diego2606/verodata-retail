import pool from '../../../config/db';
import { ListarProductosQuery } from '../schemas/product.schemas';

export interface ProductoRow {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_regular: number;
  precio_oferta: number | null;
  imagen_url: string | null;
  activo: boolean;
  stock_actual: number;
  creado_en: Date;
  actualizado_en: Date;
}

export interface CrearProductoData {
  categoria_id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precio_regular: number;
  precio_oferta: number | null;
  imagen_url: string | null;
}

/** Campos ausentes (undefined) = no se modifican. */
export interface ActualizarProductoData {
  categoria_id?: number;
  nombre?: string;
  descripcion?: string;
  precio_regular?: number;
  precio_oferta?: number | null;
  imagen_url?: string | null;
}

const SELECT_PRODUCTO = `
  SELECT
    p.id,
    p.categoria_id,
    c.nombre                     AS categoria_nombre,
    p.sku,
    p.nombre,
    p.descripcion,
    p.precio_regular::float8     AS precio_regular,
    p.precio_oferta::float8      AS precio_oferta,
    p.imagen_url,
    p.activo,
    COALESCE(i.stock_actual, 0)  AS stock_actual,
    p.creado_en,
    p.actualizado_en
  FROM productos p
  INNER JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN inventario i ON i.producto_id = p.id
`;

export const productRepository = {
  async listar(filtros: ListarProductosQuery): Promise<ProductoRow[]> {
    const search = filtros.search ? `%${filtros.search}%` : null;
    const categoriaId = filtros.categoria_id ?? null;
    const activo = filtros.activo ?? null;

    const query = `
      ${SELECT_PRODUCTO}
      WHERE ($1::text IS NULL OR p.nombre ILIKE $1 OR p.sku ILIKE $1)
        AND ($2::int IS NULL OR p.categoria_id = $2)
        AND ($3::boolean IS NULL OR p.activo = $3)
      ORDER BY p.creado_en DESC
    `;
    const result = await pool.query<ProductoRow>(query, [search, categoriaId, activo]);
    return result.rows;
  },

  async obtenerPorId(id: string): Promise<ProductoRow | null> {
    const result = await pool.query<ProductoRow>(
      `${SELECT_PRODUCTO} WHERE p.id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async existeSku(sku: string): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM productos WHERE sku = $1`,
      [sku]
    );
    return Number(result.rows[0].count) > 0;
  },

  async existeCategoria(id: number): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM categorias WHERE id = $1`,
      [id]
    );
    return Number(result.rows[0].count) > 0;
  },

  /** HU007 CA04: inserta producto + su fila de inventario (0/5) en una transacción. */
  async crear(data: CrearProductoData): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const productResult = await client.query<{ id: string }>(
        `INSERT INTO productos
           (categoria_id, sku, nombre, descripcion, precio_regular, precio_oferta, imagen_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          data.categoria_id,
          data.sku,
          data.nombre,
          data.descripcion,
          data.precio_regular,
          data.precio_oferta,
          data.imagen_url,
        ]
      );
      const productoId = productResult.rows[0].id;

      await client.query(
        `INSERT INTO inventario (producto_id, stock_actual, stock_minimo) VALUES ($1, 0, 5)`,
        [productoId]
      );

      await client.query('COMMIT');
      return productoId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * HU008: actualización dinámica de la ficha. Solo cambia los campos enviados
   * (undefined = no modificar; null = limpiar). Actualiza `actualizado_en` (CA03).
   * No toca `sku` ni afecta snapshots históricos de pedidos (CA04).
   */
  async actualizar(id: string, data: ActualizarProductoData): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const add = (column: string, value: unknown): void => {
      sets.push(`${column} = $${idx++}`);
      values.push(value);
    };

    if (data.categoria_id !== undefined) add('categoria_id', data.categoria_id);
    if (data.nombre !== undefined) add('nombre', data.nombre);
    if (data.descripcion !== undefined) add('descripcion', data.descripcion);
    if (data.precio_regular !== undefined) add('precio_regular', data.precio_regular);
    if (data.precio_oferta !== undefined) add('precio_oferta', data.precio_oferta);
    if (data.imagen_url !== undefined) add('imagen_url', data.imagen_url);

    sets.push('actualizado_en = NOW()');
    values.push(id);

    await pool.query(`UPDATE productos SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },
};
