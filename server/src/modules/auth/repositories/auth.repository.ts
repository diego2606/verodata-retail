import pool from '../../../config/db';
import { TipoDocumento } from '../../../shared/types/api.types';

export interface UsuarioRow {
  id: string;           // UUID en el esquema existente
  email: string;
  password_hash: string;
  rol_id: number;       // columna real: rol_id
  nombre_rol: string;
  bloqueado: boolean;   // columna real: bloqueado (true = cuenta bloqueada)
  intentos_fallidos: number;
  bloqueado_hasta: Date | null; // se agrega como NULL hasta ejecutar setup.sql
}

export interface RegistroData {
  email: string;
  password_hash: string;
  rol_id: number;
  nombres: string;
  apellidos: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono: string;
}

export const authRepository = {
  async findByEmail(email: string): Promise<UsuarioRow | null> {
    // NOTA: esquema detectado en Supabase usa rol_id, bloqueado (sin bloqueado_hasta)
    const query = `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.rol_id,
        r.nombre    AS nombre_rol,
        u.bloqueado,
        u.intentos_fallidos,
        NULL::timestamptz AS bloqueado_hasta
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      WHERE u.email = $1
      LIMIT 1
    `;
    const result = await pool.query<UsuarioRow>(query, [email]);
    return result.rows[0] ?? null;
  },

  async incrementarIntentosFallidos(id: string): Promise<number> {
    const result = await pool.query<{ intentos_fallidos: number }>(
      `UPDATE usuarios
       SET intentos_fallidos = intentos_fallidos + 1,
           actualizado_en = NOW()
       WHERE id = $1
       RETURNING intentos_fallidos`,
      [id]
    );
    return result.rows[0]?.intentos_fallidos ?? 0;
  },

  async resetearIntentosFallidos(id: string): Promise<void> {
    await pool.query(
      `UPDATE usuarios
       SET intentos_fallidos = 0,
           bloqueado = FALSE,
           actualizado_en = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async existeEmail(email: string): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM usuarios WHERE email = $1`,
      [email]
    );
    return Number(result.rows[0].count) > 0;
  },

  async existeDocumento(tipo_documento: TipoDocumento, numero_documento: string): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM datos_personales
       WHERE tipo_documento = $1 AND numero_documento = $2`,
      [tipo_documento, numero_documento]
    );
    return Number(result.rows[0].count) > 0;
  },

  async registrarUsuario(data: RegistroData): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insertar en usuarios usando gen_random_uuid() si el id es UUID
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO usuarios (id, email, password_hash, rol_id, intentos_fallidos, bloqueado)
         VALUES (gen_random_uuid(), $1, $2, $3, 0, FALSE)
         RETURNING id`,
        [data.email, data.password_hash, data.rol_id]
      );
      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO datos_personales
           (usuario_id, tipo_documento, numero_documento, nombres, apellidos, telefono)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, data.tipo_documento, data.numero_documento, data.nombres, data.apellidos, data.telefono]
      );

      await client.query('COMMIT');
      return userId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
