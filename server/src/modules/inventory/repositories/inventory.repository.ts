import pool from '../../../config/db';

export interface InventarioRow {
  producto_id: string;
  stock_actual: number;
  stock_minimo: number;
  actualizado_en: Date;
}

export interface AlertaStockRow {
  producto_id: string;
  sku: string;
  nombre: string;
  categoria_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  faltante: number;
}

export const inventoryRepository = {
  async obtenerPorProducto(productoId: string): Promise<InventarioRow | null> {
    const result = await pool.query<InventarioRow>(
      `SELECT producto_id, stock_actual, stock_minimo, actualizado_en
       FROM inventario WHERE producto_id = $1 LIMIT 1`,
      [productoId]
    );
    return result.rows[0] ?? null;
  },

  /**
   * HU010/HU011: ajuste atómico del stock. El UPDATE condicional impide que el
   * stock quede negativo. `stockMinimo = null` conserva el valor actual.
   * Devuelve null si el producto no existe o el ajuste dejaría el stock < 0.
   */
  async ajustar(
    productoId: string,
    ajuste: number,
    stockMinimo: number | null
  ): Promise<InventarioRow | null> {
    const result = await pool.query<InventarioRow>(
      `UPDATE inventario
       SET stock_actual   = stock_actual + $2,
           stock_minimo   = COALESCE($3, stock_minimo),
           actualizado_en = NOW()
       WHERE producto_id = $1 AND stock_actual + $2 >= 0
       RETURNING producto_id, stock_actual, stock_minimo, actualizado_en`,
      [productoId, ajuste, stockMinimo]
    );
    return result.rows[0] ?? null;
  },

  /** HU012 CA03: productos activos cuyo stock está en o bajo el mínimo (alerta calculada). */
  async listarAlertas(): Promise<AlertaStockRow[]> {
    const result = await pool.query<AlertaStockRow>(
      `SELECT
         i.producto_id,
         p.sku,
         p.nombre,
         c.nombre AS categoria_nombre,
         i.stock_actual,
         i.stock_minimo,
         GREATEST(i.stock_minimo - i.stock_actual, 0)::int AS faltante
       FROM inventario i
       INNER JOIN productos  p ON p.id = i.producto_id
       INNER JOIN categorias c ON c.id = p.categoria_id
       WHERE p.activo = TRUE AND i.stock_actual <= i.stock_minimo
       ORDER BY (i.stock_actual - i.stock_minimo) ASC, p.nombre ASC`
    );
    return result.rows;
  },
};
