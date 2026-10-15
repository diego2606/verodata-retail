import pool from '../../../config/db';

export interface SiteConfigRow {
  clave: string;
  valor: unknown;
  actualizado_en: Date;
}

/** HU034: textos y franjas globales de la tienda (clave/valor en JSONB). */
export const siteConfigRepository = {
  async listar(): Promise<SiteConfigRow[]> {
    const result = await pool.query<SiteConfigRow>(
      `SELECT clave, valor, actualizado_en FROM sitio_config ORDER BY clave ASC`
    );
    return result.rows;
  },

  async obtener(clave: string): Promise<SiteConfigRow | null> {
    const result = await pool.query<SiteConfigRow>(
      `SELECT clave, valor, actualizado_en FROM sitio_config WHERE clave = $1 LIMIT 1`,
      [clave]
    );
    return result.rows[0] ?? null;
  },

  async upsert(clave: string, valor: unknown): Promise<SiteConfigRow> {
    const result = await pool.query<SiteConfigRow>(
      `INSERT INTO sitio_config (clave, valor)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (clave)
       DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
       RETURNING clave, valor, actualizado_en`,
      [clave, JSON.stringify(valor)]
    );
    return result.rows[0];
  },
};
