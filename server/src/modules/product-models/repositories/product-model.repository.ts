import pool from '../../../config/db';

/** Fila del Producto Padre (Modelo). */
export interface ProductoModeloRow {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  nombre: string;
  marca: string | null;
  modelo_codigo: string | null;
  descripcion: string | null;
  atributos_variantes: string[];
  activo: boolean;
  destacado: boolean;
  destacado_orden: number | null;
  creado_en: Date;
  actualizado_en: Date;
}

/** SKU hijo devuelto al frontend. */
export interface SkuVarianteRow {
  id: string;
  sku: string;
  codigo_barras: string | null;
  atributos: Record<string, string>;
  precio_regular: number;
  precio_oferta: number | null;
  activo: boolean;
  stock_actual: number;
  stock_minimo: number;
}

export interface CrearModeloData {
  categoria_id: number;
  nombre: string;
  marca: string | null;
  modelo_codigo: string | null;
  descripcion: string | null;
  atributos_variantes: string[];
}

export interface ActualizarModeloData {
  categoria_id?: number;
  nombre?: string;
  marca?: string | null;
  modelo_codigo?: string | null;
  descripcion?: string | null;
  atributos_variantes?: string[];
  activo?: boolean;
}

/** Variante nueva ya resuelta (SKU generado/validado) y lista para persistir. */
export interface NuevaVariantePreparada {
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
}

/** Variante existente a modificar (solo campos mutables). */
export interface ActualizarVariantePreparada {
  sku_id: string;
  precio_regular?: number;
  /** true = el payload definió `precio_oferta` (aunque sea null para quitarla). */
  reemplazaOferta: boolean;
  precio_oferta: number | null;
  codigo_barras?: string | null;
  activo?: boolean;
  stock_actual?: number;
  stock_minimo?: number;
}

export interface DeltaPreparado {
  nuevas: NuevaVariantePreparada[];
  actualizar: ActualizarVariantePreparada[];
  eliminar: string[];
}

export interface ResumenDeltaTx {
  creadas: number;
  actualizadas: number;
  desactivadas: number;
}

const SELECT_MODELO = `
  SELECT
    m.id, m.categoria_id, c.nombre AS categoria_nombre, m.nombre, m.marca,
    m.modelo_codigo, m.descripcion, m.atributos_variantes, m.activo,
    m.destacado, m.destacado_orden, m.creado_en, m.actualizado_en
  FROM productos_modelo m
  INNER JOIN categorias c ON c.id = m.categoria_id
`;

const SELECT_VARIANTE = `
  SELECT
    p.id, p.sku, p.codigo_barras, p.atributos,
    p.precio_regular::float8 AS precio_regular,
    p.precio_oferta::float8  AS precio_oferta,
    p.activo,
    COALESCE(i.stock_actual, 0) AS stock_actual,
    COALESCE(i.stock_minimo, 5) AS stock_minimo
  FROM productos p
  LEFT JOIN inventario i ON i.producto_id = p.id
`;

export const productModelRepository = {
  async listar(): Promise<ProductoModeloRow[]> {
    const result = await pool.query<ProductoModeloRow>(
      `${SELECT_MODELO} ORDER BY m.creado_en DESC`
    );
    return result.rows;
  },

  async obtenerPorId(id: string): Promise<ProductoModeloRow | null> {
    const result = await pool.query<ProductoModeloRow>(
      `${SELECT_MODELO} WHERE m.id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async listarVariantes(modeloId: string): Promise<SkuVarianteRow[]> {
    const result = await pool.query<SkuVarianteRow>(
      `${SELECT_VARIANTE} WHERE p.modelo_id = $1 ORDER BY p.creado_en ASC`,
      [modeloId]
    );
    return result.rows;
  },

  /** Modelo asociado a un SKU (null si el SKU no existe o no tiene modelo). */
  async obtenerModeloIdPorSku(skuId: string): Promise<string | null | undefined> {
    const result = await pool.query<{ modelo_id: string | null }>(
      `SELECT modelo_id FROM productos WHERE id = $1 LIMIT 1`,
      [skuId]
    );
    if (result.rows.length === 0) return undefined;
    return result.rows[0].modelo_id;
  },

  async existeSku(sku: string, exceptoId: string | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM productos WHERE sku = $1 AND ($2::uuid IS NULL OR id <> $2)`,
      [sku, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  async crear(data: CrearModeloData): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO productos_modelo
         (categoria_id, nombre, marca, modelo_codigo, descripcion, atributos_variantes)
       VALUES ($1, $2, $3, $4, $5, $6::text[])
       RETURNING id`,
      [
        data.categoria_id,
        data.nombre,
        data.marca,
        data.modelo_codigo,
        data.descripcion,
        data.atributos_variantes,
      ]
    );
    return result.rows[0].id;
  },

  async actualizar(id: string, data: ActualizarModeloData): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const add = (column: string, value: unknown): void => {
      sets.push(`${column} = $${idx++}`);
      values.push(value);
    };

    if (data.categoria_id !== undefined) add('categoria_id', data.categoria_id);
    if (data.nombre !== undefined) add('nombre', data.nombre);
    if (data.marca !== undefined) add('marca', data.marca);
    if (data.modelo_codigo !== undefined) add('modelo_codigo', data.modelo_codigo);
    if (data.descripcion !== undefined) add('descripcion', data.descripcion);
    if (data.atributos_variantes !== undefined) {
      sets.push(`atributos_variantes = $${idx++}::text[]`);
      values.push(data.atributos_variantes);
    }
    if (data.activo !== undefined) add('activo', data.activo);

    if (sets.length === 0) return;
    sets.push('actualizado_en = NOW()');
    values.push(id);

    await pool.query(`UPDATE productos_modelo SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },

  /**
   * Aplica el delta completo en UNA transacción ACID (HU035 CA08).
   * `FOR UPDATE` sobre el padre serializa ediciones concurrentes del mismo modelo;
   * el índice uq_productos_modelo_combinacion es la barrera final contra duplicados.
   */
  async aplicarDelta(modeloId: string, delta: DeltaPreparado): Promise<ResumenDeltaTx> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM productos_modelo WHERE id = $1 FOR UPDATE', [modeloId]);

      let creadas = 0;
      for (const v of delta.nuevas) {
        const ins = await client.query<{ id: string }>(
          `INSERT INTO productos
             (modelo_id, categoria_id, sku, codigo_barras, nombre, descripcion,
              precio_regular, precio_oferta, atributos, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, TRUE)
           RETURNING id`,
          [
            modeloId,
            v.categoria_id,
            v.sku,
            v.codigo_barras,
            v.nombre,
            v.descripcion,
            v.precio_regular,
            v.precio_oferta,
            JSON.stringify(v.atributos),
          ]
        );
        await client.query(
          `INSERT INTO inventario (producto_id, stock_actual, stock_minimo) VALUES ($1, $2, $3)`,
          [ins.rows[0].id, v.stock_actual, v.stock_minimo]
        );
        creadas += 1;
      }

      let actualizadas = 0;
      for (const v of delta.actualizar) {
        const upd = await client.query(
          `UPDATE productos
             SET precio_regular = COALESCE($1, precio_regular),
                 precio_oferta  = CASE WHEN $2::boolean THEN $3 ELSE precio_oferta END,
                 codigo_barras  = COALESCE($4, codigo_barras),
                 activo         = COALESCE($5, activo),
                 actualizado_en = NOW()
           WHERE id = $6 AND modelo_id = $7`,
          [
            v.precio_regular,
            v.reemplazaOferta,
            v.precio_oferta,
            v.codigo_barras,
            v.activo,
            v.sku_id,
            modeloId,
          ]
        );
        if ((upd.rowCount ?? 0) === 0) throw new VarianteAjenaError(v.sku_id);

        await client.query(
          `INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
           VALUES ($1, COALESCE($2, 0), COALESCE($3, 5))
           ON CONFLICT (producto_id) DO UPDATE
             SET stock_actual = COALESCE($2, inventario.stock_actual),
                 stock_minimo = COALESCE($3, inventario.stock_minimo),
                 actualizado_en = NOW()`,
          [v.sku_id, v.stock_actual, v.stock_minimo]
        );
        actualizadas += 1;
      }

      let desactivadas = 0;
      if (delta.eliminar.length > 0) {
        const res = await client.query(
          `UPDATE productos SET activo = FALSE, actualizado_en = NOW()
           WHERE modelo_id = $1 AND id = ANY($2::uuid[])`,
          [modeloId, delta.eliminar]
        );
        desactivadas = res.rowCount ?? 0;
      }

      await client.query('COMMIT');
      return { creadas, actualizadas, desactivadas };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

/** La variante a actualizar no pertenece al modelo indicado. */
export class VarianteAjenaError extends Error {
  constructor(readonly skuId: string) {
    super(`La variante ${skuId} no pertenece a este producto`);
    this.name = 'VarianteAjenaError';
  }
}
