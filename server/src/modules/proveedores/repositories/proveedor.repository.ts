import pool from '../../../config/db';

export interface ProveedorRow {
  id: string;
  nombre_empresa: string;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  categoria_productos: string | null;
  activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
}

export interface CrearProveedorData {
  nombre_empresa: string;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  categoria_productos: string | null;
}

const SELECT_PROVEEDOR = `
  SELECT id, nombre_empresa, contacto_nombre, telefono, email,
         categoria_productos, activo, creado_en, actualizado_en
  FROM proveedores
`;

export const proveedorRepository = {
  /** Proveedores activos, con búsqueda opcional por razón social (dropdown). */
  async listar(search?: string): Promise<ProveedorRow[]> {
    if (search) {
      const result = await pool.query<ProveedorRow>(
        `${SELECT_PROVEEDOR} WHERE activo = TRUE AND nombre_empresa ILIKE $1 ORDER BY nombre_empresa ASC`,
        [`%${search}%`]
      );
      return result.rows;
    }
    const result = await pool.query<ProveedorRow>(
      `${SELECT_PROVEEDOR} WHERE activo = TRUE ORDER BY nombre_empresa ASC`
    );
    return result.rows;
  },

  async obtenerPorId(id: string): Promise<ProveedorRow | null> {
    const result = await pool.query<ProveedorRow>(
      `${SELECT_PROVEEDOR} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  /** Unicidad insensible a mayúsculas del nombre de empresa. */
  async existeNombre(nombre: string): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM proveedores WHERE LOWER(nombre_empresa) = LOWER($1)`,
      [nombre]
    );
    return Number(result.rows[0].count) > 0;
  },

  async crear(data: CrearProveedorData): Promise<ProveedorRow> {
    const result = await pool.query<ProveedorRow>(
      `INSERT INTO proveedores
         (nombre_empresa, contacto_nombre, telefono, email, categoria_productos)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre_empresa, contacto_nombre, telefono, email,
                 categoria_productos, activo, creado_en, actualizado_en`,
      [
        data.nombre_empresa,
        data.contacto_nombre,
        data.telefono,
        data.email,
        data.categoria_productos,
      ]
    );
    return result.rows[0];
  },
};
