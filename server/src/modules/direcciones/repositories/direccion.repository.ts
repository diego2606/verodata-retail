import pool from '../../../config/db';
import { ActualizarDireccionInput, CrearDireccionInput } from '../schemas/direccion.schemas';

export interface DireccionRow {
  id: string;
  usuario_id: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion_linea: string;
  referencia: string | null;
  codigo_postal: string | null;
  /** Geolocalización opcional (migración 012). NULL si el usuario no usó el mapa. */
  latitud: number | null;
  longitud: number | null;
  es_principal: boolean;
  creado_en: Date;
  actualizado_en: Date;
}

const COLUMNAS = `id, usuario_id, departamento, provincia, distrito, direccion_linea,
  referencia, codigo_postal, latitud, longitud, es_principal, creado_en, actualizado_en`;

/** HU017: libreta de direcciones desacoplada en 3FN. */
export const direccionRepository = {
  async listar(usuarioId: string): Promise<DireccionRow[]> {
    const result = await pool.query<DireccionRow>(
      `SELECT ${COLUMNAS} FROM direcciones WHERE usuario_id = $1
       ORDER BY es_principal DESC, creado_en DESC`,
      [usuarioId]
    );
    return result.rows;
  },

  async obtenerPorId(id: string, usuarioId: string): Promise<DireccionRow | null> {
    const result = await pool.query<DireccionRow>(
      `SELECT ${COLUMNAS} FROM direcciones WHERE id = $1 AND usuario_id = $2 LIMIT 1`,
      [id, usuarioId]
    );
    return result.rows[0] ?? null;
  },

  /** La primera dirección del usuario se marca principal automáticamente. */
  async crear(usuarioId: string, data: CrearDireccionInput): Promise<DireccionRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const countRes = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM direcciones WHERE usuario_id = $1`,
        [usuarioId]
      );
      const esPrincipal = data.es_principal === true || Number(countRes.rows[0].count) === 0;

      if (esPrincipal) {
        await client.query(`UPDATE direcciones SET es_principal = FALSE WHERE usuario_id = $1`, [
          usuarioId,
        ]);
      }

      const result = await client.query<DireccionRow>(
        `INSERT INTO direcciones
           (usuario_id, departamento, provincia, distrito, direccion_linea, referencia, codigo_postal, latitud, longitud, es_principal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${COLUMNAS}`,
        [
          usuarioId,
          data.departamento,
          data.provincia,
          data.distrito,
          data.direccion_linea,
          data.referencia ?? null,
          data.codigo_postal ?? null,
          data.latitud ?? null,
          data.longitud ?? null,
          esPrincipal,
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async actualizar(
    id: string,
    usuarioId: string,
    data: ActualizarDireccionInput
  ): Promise<DireccionRow | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (data.es_principal === true) {
        await client.query(`UPDATE direcciones SET es_principal = FALSE WHERE usuario_id = $1`, [
          usuarioId,
        ]);
      }

      const sets: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      const add = (column: string, value: unknown): void => {
        sets.push(`${column} = $${idx++}`);
        values.push(value);
      };
      if (data.departamento !== undefined) add('departamento', data.departamento);
      if (data.provincia !== undefined) add('provincia', data.provincia);
      if (data.distrito !== undefined) add('distrito', data.distrito);
      if (data.direccion_linea !== undefined) add('direccion_linea', data.direccion_linea);
      if (data.referencia !== undefined) add('referencia', data.referencia);
      if (data.codigo_postal !== undefined) add('codigo_postal', data.codigo_postal);
      if (data.latitud !== undefined) add('latitud', data.latitud);
      if (data.longitud !== undefined) add('longitud', data.longitud);
      if (data.es_principal !== undefined) add('es_principal', data.es_principal);

      if (sets.length === 0) {
        await client.query('ROLLBACK');
        return this.obtenerPorId(id, usuarioId);
      }

      add('actualizado_en', new Date());
      values.push(id, usuarioId);
      const result = await client.query<DireccionRow>(
        `UPDATE direcciones SET ${sets.join(', ')} WHERE id = $${idx} AND usuario_id = $${idx + 1}
         RETURNING ${COLUMNAS}`,
        values
      );

      await client.query('COMMIT');
      return result.rows[0] ?? null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async marcarPrincipal(id: string, usuarioId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existe = await client.query(`SELECT 1 FROM direcciones WHERE id = $1 AND usuario_id = $2`, [
        id,
        usuarioId,
      ]);
      if ((existe.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query(`UPDATE direcciones SET es_principal = FALSE WHERE usuario_id = $1`, [usuarioId]);
      await client.query(
        `UPDATE direcciones SET es_principal = TRUE, actualizado_en = NOW() WHERE id = $1 AND usuario_id = $2`,
        [id, usuarioId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async eliminar(id: string, usuarioId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM direcciones WHERE id = $1 AND usuario_id = $2 RETURNING id`,
      [id, usuarioId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
