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

export interface ActualizarUsuarioData {
  /** null = no modificar */
  email: string | null;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
}

/** Proyección estándar de un colaborador (nunca expone password_hash). */
const SELECT_USUARIO = `
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
`;

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
      ${SELECT_USUARIO}
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

  /** HU004: consulta unitaria por ID. */
  async obtenerPorId(id: string): Promise<UsuarioListadoRow | null> {
    const result = await pool.query<UsuarioListadoRow>(
      `${SELECT_USUARIO} WHERE u.id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  /** HU004: consulta unitaria por número de documento. */
  async obtenerPorDocumento(numeroDocumento: string): Promise<UsuarioListadoRow | null> {
    const result = await pool.query<UsuarioListadoRow>(
      `${SELECT_USUARIO} WHERE dp.numero_documento = $1 LIMIT 1`,
      [numeroDocumento]
    );
    return result.rows[0] ?? null;
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

  /** HU005: unicidad de email excluyendo al propio usuario. */
  async existeEmailOtro(email: string, id: string): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM usuarios WHERE email = $1 AND id <> $2`,
      [email, id]
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

  /** HU005: unicidad de documento excluyendo al propio usuario. */
  async existeDocumentoOtro(
    tipo_documento: TipoDocumento,
    numero_documento: string,
    id: string
  ): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM datos_personales
       WHERE tipo_documento = $1 AND numero_documento = $2 AND usuario_id <> $3`,
      [tipo_documento, numero_documento, id]
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

  /**
   * HU005: actualización transaccional. No toca password_hash ni rol_id.
   * Upsert de datos_personales cuando se dispone de los campos obligatorios.
   */
  async actualizar(id: string, data: ActualizarUsuarioData): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (data.email !== null) {
        await client.query(
          `UPDATE usuarios SET email = $2, actualizado_en = NOW() WHERE id = $1`,
          [id, data.email]
        );
      } else {
        await client.query(`UPDATE usuarios SET actualizado_en = NOW() WHERE id = $1`, [id]);
      }

      const completos =
        data.tipo_documento !== null &&
        data.numero_documento !== null &&
        data.nombres !== null &&
        data.apellidos !== null;

      if (completos) {
        await client.query(
          `INSERT INTO datos_personales
             (usuario_id, tipo_documento, numero_documento, nombres, apellidos, telefono)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (usuario_id) DO UPDATE SET
             tipo_documento   = EXCLUDED.tipo_documento,
             numero_documento = EXCLUDED.numero_documento,
             nombres          = EXCLUDED.nombres,
             apellidos        = EXCLUDED.apellidos,
             telefono         = EXCLUDED.telefono`,
          [
            id,
            data.tipo_documento,
            data.numero_documento,
            data.nombres,
            data.apellidos,
            data.telefono,
          ]
        );
      } else {
        await client.query(
          `UPDATE datos_personales SET
             tipo_documento   = COALESCE($2, tipo_documento),
             numero_documento = COALESCE($3, numero_documento),
             nombres          = COALESCE($4, nombres),
             apellidos        = COALESCE($5, apellidos),
             telefono         = COALESCE($6, telefono)
           WHERE usuario_id = $1`,
          [
            id,
            data.tipo_documento,
            data.numero_documento,
            data.nombres,
            data.apellidos,
            data.telefono,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

  /**
   * Establece una contraseña nueva (ya hasheada) y limpia los intentos fallidos,
   * con el mismo criterio que el restablecimiento de contraseña del cliente.
   * NO toca `bloqueado`: levantar una suspensión es una acción aparte y deliberada.
   * Nunca devuelve ni registra el hash.
   */
  async actualizarPassword(id: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE usuarios
       SET password_hash = $2,
           intentos_fallidos = 0,
           actualizado_en = NOW()
       WHERE id = $1`,
      [id, passwordHash]
    );
  },
};
