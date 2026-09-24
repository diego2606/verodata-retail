import pool from '../../../config/db';
import { RolUsuario, TipoDocumento } from '../../../shared/types/api.types';
import { ListarUsuariosQuery } from '../schemas/user.schemas';

export interface UsuarioListadoRow {
  id: string;
  email: string;
  rol: RolUsuario;
  bloqueado: boolean;
  intentos_fallidos: number;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  creado_en: Date;
}

export interface RolRow {
  id: number;
  nombre: RolUsuario;
}

export interface CrearUsuarioData {
  email: string;
  password_hash: string;
  rol_id: number;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
}

export const userRepository = {
  /**
   * Listado combinando usuarios, roles y datos_personales (HU003).
   * Los filtros son opcionales y se resuelven con parámetros posicionales
   * para evitar concatenación de SQL.
   */
  async listar(filtros: ListarUsuariosQuery): Promise<UsuarioListadoRow[]> {
    const search = filtros.search ? `%${filtros.search}%` : null;
    const rol = filtros.rol ?? null;
    const bloqueado = filtros.bloqueado ?? null;

    const query = `
      SELECT
        u.id,
        u.email,
        r.nombre            AS rol,
        u.bloqueado,
        u.intentos_fallidos,
        dp.tipo_documento,
        dp.numero_documento,
        dp.nombres,
        dp.apellidos,
        dp.telefono,
        u.creado_en
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      LEFT JOIN datos_personales dp ON dp.usuario_id = u.id
      WHERE ($1::text IS NULL
             OR u.email ILIKE $1
             OR dp.numero_documento ILIKE $1
             OR dp.nombres ILIKE $1
             OR dp.apellidos ILIKE $1)
        AND ($2::text IS NULL OR r.nombre::text = $2)
        AND ($3::boolean IS NULL OR u.bloqueado = $3)
      ORDER BY u.creado_en DESC
    `;

    const result = await pool.query<UsuarioListadoRow>(query, [search, rol, bloqueado]);
    return result.rows;
  },

  async listarRoles(): Promise<RolRow[]> {
    const result = await pool.query<RolRow>(`SELECT id, nombre FROM roles ORDER BY id`);
    return result.rows;
  },

  async existeRol(id: number): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM roles WHERE id = $1`,
      [id]
    );
    return Number(result.rows[0].count) > 0;
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

  /** Inserción atómica usuarios + datos_personales (HU002 CA05). */
  async crear(data: CrearUsuarioData): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query<{ id: string }>(
        `INSERT INTO usuarios (email, password_hash, rol_id, intentos_fallidos, bloqueado)
         VALUES ($1, $2, $3, 0, FALSE)
         RETURNING id`,
        [data.email, data.password_hash, data.rol_id]
      );
      const usuarioId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO datos_personales
           (usuario_id, tipo_documento, numero_documento, nombres, apellidos, telefono)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          usuarioId,
          data.tipo_documento,
          data.numero_documento,
          data.nombres,
          data.apellidos,
          data.telefono,
        ]
      );

      await client.query('COMMIT');
      return usuarioId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async existeUsuario(id: string): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM usuarios WHERE id = $1`,
      [id]
    );
    return Number(result.rows[0].count) > 0;
  },

  /**
   * Bloqueo / desbloqueo de cuenta (HU001 / HU015).
   * Al desbloquear se resetean los intentos fallidos acumulados.
   */
  async actualizarBloqueo(id: string, bloqueado: boolean): Promise<void> {
    await pool.query(
      `UPDATE usuarios
       SET bloqueado = $2,
           intentos_fallidos = CASE WHEN $2 = FALSE THEN 0 ELSE intentos_fallidos END,
           actualizado_en = NOW()
       WHERE id = $1`,
      [id, bloqueado]
    );
  },
};
