import pool from '../../../config/db';

export interface UsuarioRow {
  id: string; // UUID en el esquema existente
  email: string;
  password_hash: string;
  rol_id: number;
  nombre_rol: string;
  nombres: string | null;
  bloqueado: boolean; // bloqueado=TRUE = cuenta suspendida
  intentos_fallidos: number;
  bloqueado_hasta: Date | null; // NULL hasta que exista la columna en el schema
}

export interface ResetRow {
  id: string;
  usuario_id: string;
  expira_en: Date;
  usado_en: Date | null;
}

export const authRepository = {
  async findByEmail(email: string): Promise<UsuarioRow | null> {
    const query = `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.rol_id,
        r.nombre    AS nombre_rol,
        dp.nombres,
        u.bloqueado,
        u.intentos_fallidos,
        NULL::timestamptz AS bloqueado_hasta
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      LEFT JOIN datos_personales dp ON dp.usuario_id = u.id
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

  /** ID del rol por nombre (para asignar CLIENTE al registrar). */
  async obtenerRolIdPorNombre(nombre: string): Promise<number | null> {
    const result = await pool.query<{ id: number }>(
      `SELECT id FROM roles WHERE nombre::text = $1 LIMIT 1`,
      [nombre]
    );
    return result.rows[0]?.id ?? null;
  },

  async crearReset(usuarioId: string, tokenHash: string, expiraEn: Date): Promise<void> {
    await pool.query(
      `INSERT INTO password_resets (usuario_id, token_hash, expira_en)
       VALUES ($1, $2, $3)`,
      [usuarioId, tokenHash, expiraEn]
    );
  },

  async obtenerResetValido(tokenHash: string): Promise<ResetRow | null> {
    const result = await pool.query<ResetRow>(
      `SELECT id, usuario_id, expira_en, usado_en
       FROM password_resets
       WHERE token_hash = $1
       ORDER BY creado_en DESC
       LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] ?? null;
  },

  async marcarResetUsado(id: string): Promise<void> {
    await pool.query(`UPDATE password_resets SET usado_en = NOW() WHERE id = $1`, [id]);
  },

  /** Restablece la contraseña y limpia bloqueo/intentos. */
  async actualizarPasswordHash(usuarioId: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE usuarios
       SET password_hash = $2,
           intentos_fallidos = 0,
           bloqueado = FALSE,
           actualizado_en = NOW()
       WHERE id = $1`,
      [usuarioId, passwordHash]
    );
  },

  /** Usuario vinculado a un proveedor OAuth (por su id en el proveedor). */
  async buscarPorOAuth(proveedor: string, providerUserId: string): Promise<string | null> {
    const result = await pool.query<{ usuario_id: string }>(
      `SELECT usuario_id FROM usuarios_oauth
       WHERE proveedor = $1 AND provider_user_id = $2
       LIMIT 1`,
      [proveedor, providerUserId]
    );
    return result.rows[0]?.usuario_id ?? null;
  },

  async vincularOAuth(usuarioId: string, proveedor: string, providerUserId: string): Promise<void> {
    await pool.query(
      `INSERT INTO usuarios_oauth (usuario_id, proveedor, provider_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (proveedor, provider_user_id) DO NOTHING`,
      [usuarioId, proveedor, providerUserId]
    );
  },

  /** Crea un usuario social (sin contraseña) + datos_personales básicos. */
  async crearUsuarioSocial(data: {
    email: string;
    nombres: string;
    apellidos: string;
    rolId: number;
  }): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query<{ id: string }>(
        `INSERT INTO usuarios (email, password_hash, rol_id, intentos_fallidos, bloqueado)
         VALUES ($1, NULL, $2, 0, FALSE)
         RETURNING id`,
        [data.email, data.rolId]
      );
      const usuarioId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO datos_personales
           (usuario_id, tipo_documento, numero_documento, nombres, apellidos, telefono)
         VALUES ($1, NULL, NULL, $2, $3, NULL)`,
        [usuarioId, data.nombres, data.apellidos]
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
};
