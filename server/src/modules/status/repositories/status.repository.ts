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
};
