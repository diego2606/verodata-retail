import pool from '../../../config/db';
import {
  ActualizarAtributoInput,
  CrearAtributoInput,
  ActualizarValorInput,
  CrearValorInput,
} from '../schemas/atributo.schemas';

export interface AtributoRow {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'TEXTO' | 'COLOR' | 'NUMERO' | 'BOOLEANO';
  es_variante: boolean;
  unidad: string | null;
  activo: boolean;
  orden: number;
}

export interface AtributoValorRow {
  id: number;
  atributo_id: number;
  valor: string;
  slug: string;
  hex: string | null;
  meta: Record<string, unknown> | null;
  activo: boolean;
  orden: number;
}

/** Conteo de uso de un valor en los productos: (codigo de atributo, valor). */
export interface UsoValor {
  codigo: string;
  valor: string;
  usos: number;
}

export const atributoRepository = {
  async listarAtributos(): Promise<AtributoRow[]> {
    const result = await pool.query<AtributoRow>(
      `SELECT id, codigo, nombre, tipo, es_variante, unidad, activo, orden
       FROM atributos ORDER BY orden ASC, nombre ASC`
    );
    return result.rows;
  },

  async listarValores(): Promise<AtributoValorRow[]> {
    const result = await pool.query<AtributoValorRow>(
      `SELECT id, atributo_id, valor, slug, hex, meta, activo, orden
       FROM atributo_valores ORDER BY atributo_id ASC, orden ASC, valor ASC`
    );
    return result.rows;
  },

  async obtenerAtributo(id: number): Promise<AtributoRow | null> {
    const result = await pool.query<AtributoRow>(
      `SELECT id, codigo, nombre, tipo, es_variante, unidad, activo, orden FROM atributos WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async existeCodigo(codigo: string, exceptoId: number | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM atributos WHERE codigo = $1 AND ($2::int IS NULL OR id <> $2)`,
      [codigo, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  async obtenerValor(valorId: number): Promise<AtributoValorRow | null> {
    const result = await pool.query<AtributoValorRow>(
      `SELECT id, atributo_id, valor, slug, hex, meta, activo, orden FROM atributo_valores WHERE id = $1 LIMIT 1`,
      [valorId]
    );
    return result.rows[0] ?? null;
  },

  async existeValorSlug(atributoId: number, slug: string, exceptoId: number | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM atributo_valores
       WHERE atributo_id = $1 AND slug = $2 AND ($3::int IS NULL OR id <> $3)`,
      [atributoId, slug, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  async crearAtributo(data: CrearAtributoInput & { codigo: string }): Promise<number> {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO atributos (codigo, nombre, tipo, es_variante, unidad, activo, orden)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        data.codigo,
        data.nombre,
        data.tipo,
        data.es_variante ?? true,
        data.unidad ?? null,
        data.activo ?? true,
        data.orden ?? 0,
      ]
    );
    return result.rows[0].id;
  },

  async actualizarAtributo(id: number, data: ActualizarAtributoInput): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const add = (col: string, val: unknown): void => {
      sets.push(`${col} = $${idx++}`);
      values.push(val);
    };
    if (data.nombre !== undefined) add('nombre', data.nombre);
    if (data.tipo !== undefined) add('tipo', data.tipo);
    if (data.es_variante !== undefined) add('es_variante', data.es_variante);
    if (data.unidad !== undefined) add('unidad', data.unidad);
    if (data.activo !== undefined) add('activo', data.activo);
    if (data.orden !== undefined) add('orden', data.orden);
    if (sets.length === 0) return;
    values.push(id);
    await pool.query(`UPDATE atributos SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },

  async eliminarAtributo(id: number): Promise<void> {
    await pool.query(`DELETE FROM atributos WHERE id = $1`, [id]);
  },

  async contarValoresDeAtributo(atributoId: number): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM atributo_valores WHERE atributo_id = $1`,
      [atributoId]
    );
    return Number(result.rows[0].count);
  },

  async crearValor(atributoId: number, data: CrearValorInput & { slug: string }): Promise<number> {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO atributo_valores (atributo_id, valor, slug, hex, meta, activo, orden)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) RETURNING id`,
      [
        atributoId,
        data.valor,
        data.slug,
        data.hex ?? null,
        data.meta ? JSON.stringify(data.meta) : null,
        data.activo ?? true,
        data.orden ?? 0,
      ]
    );
    return result.rows[0].id;
  },

  async actualizarValor(valorId: number, data: ActualizarValorInput & { slug?: string }): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const add = (col: string, val: unknown): void => {
      sets.push(`${col} = $${idx++}`);
      values.push(val);
    };
    if (data.valor !== undefined) add('valor', data.valor);
    if (data.slug !== undefined) add('slug', data.slug);
    if (data.hex !== undefined) add('hex', data.hex);
    if (data.meta !== undefined) {
      sets.push(`meta = $${idx++}::jsonb`);
      values.push(data.meta ? JSON.stringify(data.meta) : null);
    }
    if (data.activo !== undefined) add('activo', data.activo);
    if (data.orden !== undefined) add('orden', data.orden);
    if (sets.length === 0) return;
    values.push(valorId);
    await pool.query(`UPDATE atributo_valores SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },

  async eliminarValor(valorId: number): Promise<void> {
    await pool.query(`DELETE FROM atributo_valores WHERE id = $1`, [valorId]);
  },

  /** Uso de cada valor (codigo, valor) en `productos.atributos`. */
  async contarUsoValores(): Promise<UsoValor[]> {
    const result = await pool.query<{ codigo: string; valor: string; usos: string }>(
      `SELECT kv.key AS codigo, lower(kv.value) AS valor, COUNT(DISTINCT p.id)::text AS usos
       FROM productos p, jsonb_each_text(p.atributos) kv
       WHERE kv.value IS NOT NULL AND kv.value <> ''
       GROUP BY kv.key, lower(kv.value)`
    );
    return result.rows.map((r) => ({ codigo: r.codigo, valor: r.valor, usos: Number(r.usos) }));
  },

  /** Propaga el renombre de un valor a `productos.atributos` (misma clave y valor). */
  async propagarRenombreValor(codigo: string, valorViejo: string, valorNuevo: string): Promise<number> {
    const result = await pool.query(
      `UPDATE productos
       SET atributos = jsonb_set(atributos, ARRAY[$1], to_jsonb($2::text), true)
       WHERE lower(atributos->>$1) = lower($3)`,
      [codigo, valorNuevo, valorViejo]
    );
    return result.rowCount ?? 0;
  },

  /** Nº de productos que usan un valor concreto (por código de atributo y valor). */
  async contarUsoDeValor(codigo: string, valor: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT p.id)::text AS count
       FROM productos p
       WHERE lower(p.atributos->>$1) = lower($2)`,
      [codigo, valor]
    );
    return Number(result.rows[0].count);
  },
};
