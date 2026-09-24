import pool from '../../../config/db';

export const statusRepository = {
  /** Mide la latencia de una consulta trivial (salud de la BD). */
  async ping(): Promise<number> {
    const start = Date.now();
    await pool.query('SELECT 1');
    return Date.now() - start;
  },

  async contarCategoriasActivas(): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM categorias WHERE activo = TRUE`
    );
    return Number(result.rows[0].count);
  },

  async contarProductosActivos(): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM productos WHERE activo = TRUE`
    );
    return Number(result.rows[0].count);
  },

  /** HU012: productos activos con stock en o bajo el mínimo (alerta calculada). */
  async contarProductosStockBajo(): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM inventario i
       INNER JOIN productos p ON p.id = i.producto_id
       WHERE p.activo = TRUE AND i.stock_actual <= i.stock_minimo`
    );
    return Number(result.rows[0].count);
  },
};
