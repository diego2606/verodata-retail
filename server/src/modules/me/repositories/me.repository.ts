import pool from '../../../config/db';
import { RolUsuario, TipoDocumento } from '../../../shared/types/api.types';
import { ActualizarPerfilInput } from '../schemas/me.schemas';

export interface PerfilRow {
  id: string;
  email: string;
  rol: RolUsuario;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  creado_en: Date;
}

const SELECT_PERFIL = `
  SELECT
    u.id,
    u.email,
    r.nombre            AS rol,
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

export const meRepository = {
  async obtenerPerfil(usuarioId: string): Promise<PerfilRow | null> {
    const result = await pool.query<PerfilRow>(`${SELECT_PERFIL} WHERE u.id = $1 LIMIT 1`, [usuarioId]);
    return result.rows[0] ?? null;
  },

  /** Actualiza solo los campos presentes en datos_personales. */
  async actualizarPerfil(usuarioId: string, data: ActualizarPerfilInput): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const add = (column: string, value: unknown): void => {
      sets.push(`${column} = $${idx++}`);
      values.push(value);
    };
    if (data.nombres !== undefined) add('nombres', data.nombres);
    if (data.apellidos !== undefined) add('apellidos', data.apellidos);
    if (data.telefono !== undefined) add('telefono', data.telefono);
    if (data.tipo_documento !== undefined) add('tipo_documento', data.tipo_documento);
    if (data.numero_documento !== undefined) add('numero_documento', data.numero_documento);
    if (sets.length === 0) return;

    values.push(usuarioId);
    await pool.query(
      `UPDATE datos_personales SET ${sets.join(', ')} WHERE usuario_id = $${idx}`,
      values
    );
  },

  async obtenerPasswordHash(usuarioId: string): Promise<string | null> {
    const result = await pool.query<{ password_hash: string }>(
      `SELECT password_hash FROM usuarios WHERE id = $1 LIMIT 1`,
      [usuarioId]
    );
    return result.rows[0]?.password_hash ?? null;
  },

  async actualizarPasswordHash(usuarioId: string, passwordHash: string): Promise<void> {
    await pool.query(
      `UPDATE usuarios SET password_hash = $2, actualizado_en = NOW() WHERE id = $1`,
      [usuarioId, passwordHash]
    );
  },
};
