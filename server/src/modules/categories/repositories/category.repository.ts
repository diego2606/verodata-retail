import pool from '../../../config/db';
import { ListarCategoriasQuery } from '../schemas/category.schemas';

export interface CategoriaRow {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: Date;
  productos_count: number;
}

export interface CrearCategoriaData {
  nombre: string;
  slug: string;
  descripcion: string | null;
}

export interface ActualizarCategoriaData {
  nombre: string | null;
  slug: string | null;
  descripcion: string | null;
  activo: boolean | null;
}

const SELECT_CATEGORIA = `
  SELECT
    c.id,
    c.nombre,
    c.slug,
    c.descripcion,
    c.activo,
    c.creado_en,
    COUNT(p.id)::int AS productos_count
  FROM categorias c
  LEFT JOIN productos p ON p.categoria_id = c.id
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
      ORDER BY c.nombre ASC
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

  async crear(data: CrearCategoriaData): Promise<number> {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO categorias (nombre, slug, descripcion) VALUES ($1, $2, $3) RETURNING id`,
      [data.nombre, data.slug, data.descripcion]
    );
    return result.rows[0].id;
  },

  async actualizar(id: number, data: ActualizarCategoriaData): Promise<void> {
    await pool.query(
      `UPDATE categorias SET
         nombre      = COALESCE($2, nombre),
         slug        = COALESCE($3, slug),
         descripcion = COALESCE($4, descripcion),
         activo      = COALESCE($5, activo)
       WHERE id = $1`,
      [id, data.nombre, data.slug, data.descripcion, data.activo]
    );
  },

  async tieneProductos(id: number): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM productos WHERE categoria_id = $1`,
      [id]
    );
    return Number(result.rows[0].count) > 0;
  },

  async eliminar(id: number): Promise<void> {
    await pool.query(`DELETE FROM categorias WHERE id = $1`, [id]);
  },
};
