import pool from '../../../config/db';
import { ListarColoresQuery } from '../schemas/color.schemas';

export interface ColorRow {
  id: number;
  nombre: string;
  slug: string;
  hex: string;
  activo: boolean;
  creado_en: Date;
}

export interface CrearColorData {
  nombre: string;
  slug: string;
  hex: string;
}

export interface ActualizarColorData {
  nombre?: string;
  slug?: string;
  hex?: string;
  activo?: boolean;
}

export const colorRepository = {
  async listar(filtros: ListarColoresQuery): Promise<ColorRow[]> {
    const search = filtros.search ? `%${filtros.search}%` : null;
    const activo = filtros.activo ?? null;
    const result = await pool.query<ColorRow>(
      `SELECT id, nombre, slug, hex, activo, creado_en
       FROM colores
       WHERE ($1::text IS NULL OR nombre ILIKE $1 OR slug ILIKE $1)
         AND ($2::boolean IS NULL OR activo = $2)
       ORDER BY nombre ASC`,
      [search, activo]
    );
    return result.rows;
  },

  async obtenerPorId(id: number): Promise<ColorRow | null> {
    const result = await pool.query<ColorRow>(
      `SELECT id, nombre, slug, hex, activo, creado_en FROM colores WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async existeNombre(nombre: string, exceptoId: number | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM colores WHERE lower(nombre) = lower($1) AND ($2::int IS NULL OR id <> $2)`,
      [nombre, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  async existeSlug(slug: string, exceptoId: number | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM colores WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)`,
      [slug, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  async crear(data: CrearColorData): Promise<number> {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO colores (nombre, slug, hex) VALUES ($1, $2, $3) RETURNING id`,
      [data.nombre, data.slug, data.hex]
    );
    return result.rows[0].id;
  },

  async actualizar(id: number, data: ActualizarColorData): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const add = (column: string, value: unknown): void => {
      sets.push(`${column} = $${idx++}`);
      values.push(value);
    };
    if (data.nombre !== undefined) add('nombre', data.nombre);
    if (data.slug !== undefined) add('slug', data.slug);
    if (data.hex !== undefined) add('hex', data.hex);
    if (data.activo !== undefined) add('activo', data.activo);
    if (sets.length === 0) return;
    values.push(id);
    await pool.query(`UPDATE colores SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },
};
