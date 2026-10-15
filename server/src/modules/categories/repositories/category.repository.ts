import pool from '../../../config/db';
import { ListarCategoriasQuery } from '../schemas/category.schemas';

/** Mapa de valores sugeridos por atributo: { COLOR: ['Negro','Blanco'], … } (HU030). */
export type AtributosValores = Record<string, string[]>;

export interface CategoriaRow {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  categoria_padre_id: number | null;
  atributos_permitidos: string[] | null;
  atributos_valores: AtributosValores | null;
  sku_prefijo: string | null;
  sku_segmentos: string[] | null;
  activo: boolean;
  orden: number;
  creado_en: Date;
  productos_count: number;
  hijos_count: number;
}

export interface CategoriaArbolRow {
  id: number;
  nombre: string;
  categoria_padre_id: number | null;
  atributos_permitidos: string[] | null;
  atributos_valores: AtributosValores | null;
}

export interface CrearCategoriaData {
  nombre: string;
  slug: string;
  descripcion: string | null;
  categoria_padre_id: number | null;
  atributos_permitidos: string[] | null;
  atributos_valores: AtributosValores | null;
  sku_prefijo: string | null;
  sku_segmentos: string[] | null;
}

/** Campos ausentes (undefined) = no se modifican; null = limpiar. */
export interface ActualizarCategoriaData {
  nombre?: string;
  slug?: string;
  descripcion?: string | null;
  activo?: boolean;
  categoria_padre_id?: number | null;
  atributos_permitidos?: string[] | null;
  atributos_valores?: AtributosValores | null;
  sku_prefijo?: string | null;
  sku_segmentos?: string[] | null;
}

const SELECT_CATEGORIA = `
  SELECT
    c.id,
    c.nombre,
    c.slug,
    c.descripcion,
    c.categoria_padre_id,
    c.atributos_permitidos,
    c.atributos_valores,
    c.sku_prefijo,
    c.sku_segmentos,
    c.activo,
    c.orden,
    c.creado_en,
    COUNT(DISTINCT p.id)::int AS productos_count,
    COUNT(DISTINCT h.id)::int AS hijos_count
  FROM categorias c
  LEFT JOIN productos  p ON p.categoria_id = c.id
  LEFT JOIN categorias h ON h.categoria_padre_id = c.id
`;

export const categoryRepository = {
  async listar(filtros: ListarCategoriasQuery): Promise<CategoriaRow[]> {
    const search = filtros.search ? `%${filtros.search}%` : null;
    const activo = filtros.activo ?? null;

    const query = `
      ${SELECT_CATEGORIA}
      WHERE ($1::text IS NULL OR c.nombre ILIKE $1 OR c.slug ILIKE $1)
        AND ($2::boolean IS NULL OR c.activo = $2)
      GROUP BY c.id
      ORDER BY c.categoria_padre_id NULLS FIRST, c.orden ASC, c.nombre ASC
    `;
    const result = await pool.query<CategoriaRow>(query, [search, activo]);
    return result.rows;
  },

  async obtenerPorId(id: number): Promise<CategoriaRow | null> {
    const result = await pool.query<CategoriaRow>(
      `${SELECT_CATEGORIA} WHERE c.id = $1 GROUP BY c.id LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async existeNombre(nombre: string, exceptoId: number | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM categorias WHERE lower(nombre) = lower($1) AND ($2::int IS NULL OR id <> $2)`,
      [nombre, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  async existeSlug(slug: string, exceptoId: number | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM categorias WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)`,
      [slug, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  /** IDs de todas las categorías descendientes (para impedir ciclos de jerarquía). */
  async obtenerDescendientes(id: number): Promise<number[]> {
    const result = await pool.query<{ id: number }>(
      `WITH RECURSIVE arbol AS (
         SELECT id FROM categorias WHERE categoria_padre_id = $1
         UNION ALL
         SELECT c.id FROM categorias c JOIN arbol a ON c.categoria_padre_id = a.id
       )
       SELECT id FROM arbol`,
      [id]
    );
    return result.rows.map((row) => row.id);
  },

  async crear(data: CrearCategoriaData): Promise<number> {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO categorias
         (nombre, slug, descripcion, categoria_padre_id, atributos_permitidos, atributos_valores, sku_prefijo, sku_segmentos)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING id`,
      [
        data.nombre,
        data.slug,
        data.descripcion,
        data.categoria_padre_id,
        data.atributos_permitidos,
        data.atributos_valores ? JSON.stringify(data.atributos_valores) : null,
        data.sku_prefijo,
        data.sku_segmentos,
      ]
    );
    return result.rows[0].id;
  },

  /** HU031: prefijo y plantilla de SKU de una categoría (null si no existe). */
  async obtenerPlantillaSku(
    id: number
  ): Promise<{ sku_prefijo: string | null; sku_segmentos: string[] | null } | null> {
    const result = await pool.query<{ sku_prefijo: string | null; sku_segmentos: string[] | null }>(
      `SELECT sku_prefijo, sku_segmentos FROM categorias WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    return { sku_prefijo: row.sku_prefijo, sku_segmentos: row.sku_segmentos };
  },

  /** HU029/HU030: todas las categorías (mínimo) para resolver herencia. */
  async obtenerArbolCategorias(): Promise<CategoriaArbolRow[]> {
    const result = await pool.query<CategoriaArbolRow>(
      `SELECT id, nombre, categoria_padre_id, atributos_permitidos, atributos_valores FROM categorias`
    );
    return result.rows;
  },

  /**
   * HU029/HU030: cadena desde la categoría hacia sus ancestros (incluyéndola),
   * ordenada de más cercano a más lejano. `null` si no existe.
   */
  async obtenerCadenaAtributos(id: number): Promise<{
    nombre: string;
    cadenas: Array<string[] | null>;
    cadenasValores: Array<AtributosValores | null>;
  } | null> {
    const result = await pool.query<{
      nombre: string;
      atributos_permitidos: string[] | null;
      atributos_valores: AtributosValores | null;
    }>(
      `WITH RECURSIVE cadena AS (
         SELECT id, nombre, categoria_padre_id, atributos_permitidos, atributos_valores, 0 AS nivel
         FROM categorias WHERE id = $1
         UNION ALL
         SELECT c.id, c.nombre, c.categoria_padre_id, c.atributos_permitidos, c.atributos_valores, cadena.nivel + 1
         FROM categorias c JOIN cadena ON c.id = cadena.categoria_padre_id
       )
       SELECT nombre, atributos_permitidos, atributos_valores FROM cadena ORDER BY nivel ASC`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return {
      nombre: result.rows[0].nombre,
      cadenas: result.rows.map((row) => row.atributos_permitidos),
      cadenasValores: result.rows.map((row) => row.atributos_valores),
    };
  },

  async actualizar(id: number, data: ActualizarCategoriaData): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const add = (column: string, value: unknown): void => {
      sets.push(`${column} = $${idx++}`);
      values.push(value);
    };

    if (data.nombre !== undefined) add('nombre', data.nombre);
    if (data.slug !== undefined) add('slug', data.slug);
    if (data.descripcion !== undefined) add('descripcion', data.descripcion);
    if (data.activo !== undefined) add('activo', data.activo);
    if (data.categoria_padre_id !== undefined) add('categoria_padre_id', data.categoria_padre_id);
    if (data.atributos_permitidos !== undefined) add('atributos_permitidos', data.atributos_permitidos);
    if (data.atributos_valores !== undefined) {
      sets.push(`atributos_valores = $${idx++}::jsonb`);
      values.push(data.atributos_valores ? JSON.stringify(data.atributos_valores) : null);
    }
    if (data.sku_prefijo !== undefined) add('sku_prefijo', data.sku_prefijo);
    if (data.sku_segmentos !== undefined) add('sku_segmentos', data.sku_segmentos);

    if (sets.length === 0) return;

    values.push(id);
    await pool.query(`UPDATE categorias SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },

  async tieneProductos(id: number): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM productos WHERE categoria_id = $1`,
      [id]
    );
    return Number(result.rows[0].count) > 0;
  },

  async tieneHijos(id: number): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM categorias WHERE categoria_padre_id = $1`,
      [id]
    );
    return Number(result.rows[0].count) > 0;
  },

  async eliminar(id: number): Promise<void> {
    await pool.query(`DELETE FROM categorias WHERE id = $1`, [id]);
  },

  /** Reordena en lote: `orden` = posición en el arreglo (transaccional). */
  async reordenar(ids: number[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let index = 0; index < ids.length; index += 1) {
        await client.query(`UPDATE categorias SET orden = $1 WHERE id = $2`, [index, ids[index]]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
