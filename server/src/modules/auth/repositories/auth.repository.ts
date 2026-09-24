import pool from '../../../config/db';

export interface UsuarioRow {
  id: string; // UUID en el esquema existente
  email: string;
  password_hash: string;
  rol_id: number;
  nombre_rol: string;
  bloqueado: boolean; // bloqueado=TRUE = cuenta suspendida
  intentos_fallidos: number;
  bloqueado_hasta: Date | null; // NULL hasta que exista la columna en el schema
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
};
