import pool from '../../../config/db';
import { BannerUbicacion, ListarBannersQuery } from '../schemas/banner.schemas';

export interface BannerRow {
  id: string;
  ubicacion: BannerUbicacion;
  titulo: string;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  imagen_url: string;
  orden: number;
  activo: boolean;
  vigente_desde: Date | null;
  vigente_hasta: Date | null;
  creado_en: Date;
  actualizado_en: Date;
}

export interface CrearBannerData {
  ubicacion: BannerUbicacion;
  titulo: string;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  imagen_url: string;
  orden: number;
  activo: boolean;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

export type ActualizarBannerData = Partial<CrearBannerData>;

const COLUMNAS = `id, ubicacion, titulo, subtitulo, cta_texto, cta_url, imagen_url,
  orden, activo, vigente_desde, vigente_hasta, creado_en, actualizado_en`;

/** HU034: contenido editorial de portada (hero, cintillo y banda). */
export const bannerRepository = {
  async listar(filtros: ListarBannersQuery): Promise<BannerRow[]> {
    const ubicacion = filtros.ubicacion ?? null;
    const activo = filtros.activo ?? null;
    const result = await pool.query<BannerRow>(
      `SELECT ${COLUMNAS} FROM banners
       WHERE ($1::banner_ubicacion_enum IS NULL OR ubicacion = $1)
         AND ($2::boolean IS NULL OR activo = $2)
       ORDER BY ubicacion ASC, orden ASC, creado_en ASC`,
      [ubicacion, activo]
    );
    return result.rows;
  },

  async obtenerPorId(id: string): Promise<BannerRow | null> {
    const result = await pool.query<BannerRow>(
      `SELECT ${COLUMNAS} FROM banners WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async crear(data: CrearBannerData): Promise<BannerRow> {
    const result = await pool.query<BannerRow>(
      `INSERT INTO banners
         (ubicacion, titulo, subtitulo, cta_texto, cta_url, imagen_url, orden, activo, vigente_desde, vigente_hasta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${COLUMNAS}`,
      [
        data.ubicacion,
        data.titulo,
        data.subtitulo,
        data.cta_texto,
        data.cta_url,
        data.imagen_url,
        data.orden,
        data.activo,
        data.vigente_desde,
        data.vigente_hasta,
      ]
    );
    return result.rows[0];
  },

  async actualizar(id: string, data: ActualizarBannerData): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const add = (column: string, value: unknown): void => {
      sets.push(`${column} = $${idx++}`);
      values.push(value);
    };
    if (data.ubicacion !== undefined) add('ubicacion', data.ubicacion);
    if (data.titulo !== undefined) add('titulo', data.titulo);
    if (data.subtitulo !== undefined) add('subtitulo', data.subtitulo);
    if (data.cta_texto !== undefined) add('cta_texto', data.cta_texto);
    if (data.cta_url !== undefined) add('cta_url', data.cta_url);
    if (data.imagen_url !== undefined) add('imagen_url', data.imagen_url);
    if (data.orden !== undefined) add('orden', data.orden);
    if (data.activo !== undefined) add('activo', data.activo);
    if (data.vigente_desde !== undefined) add('vigente_desde', data.vigente_desde);
    if (data.vigente_hasta !== undefined) add('vigente_hasta', data.vigente_hasta);
    if (sets.length === 0) return;
    add('actualizado_en', new Date());
    values.push(id);
    await pool.query(`UPDATE banners SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },

  async eliminar(id: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM banners WHERE id = $1 RETURNING id`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  },

  /** Reordena en lote: el orden = posición en el arreglo (transaccional). */
  async reordenar(ids: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let index = 0; index < ids.length; index += 1) {
        await client.query(`UPDATE banners SET orden = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2`, [
          index,
          ids[index],
        ]);
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
