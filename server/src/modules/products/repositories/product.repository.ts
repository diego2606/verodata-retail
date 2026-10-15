import pool from '../../../config/db';
import { ListarProductosQuery } from '../schemas/product.schemas';

export interface ProductoRow {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_regular: number;
  precio_oferta: number | null;
  imagen_url: string | null;
  modelo: string | null;
  atributos: Record<string, string>;
  activo: boolean;
  stock_actual: number;
  stock_minimo: number;
  creado_en: Date;
  actualizado_en: Date;
}

export interface CrearProductoData {
  categoria_id: number;
  sku: string;
  nombre: string;
  descripcion: string;
  precio_regular: number;
  precio_oferta: number | null;
  imagen_url: string | null;
  modelo: string | null;
  atributos: Record<string, string>;
  stock_inicial: number;
  stock_minimo: number;
}

/** HU033: fila de la galería de imágenes. */
export interface ProductoImagenRow {
  id: string;
  producto_id: string | null;
  modelo_id: string | null;
  url: string;
  alt: string | null;
  orden: number;
  es_principal: boolean;
  creado_en: Date;
}

/** HU033/HU035: ámbito de la galería de imágenes (SKU o Modelo). */
export interface GaleriaScope {
  columna: 'producto_id' | 'modelo_id';
  id: string;
}

/** Tabla cuya columna `imagen_url` (portada) se sincroniza con la imagen principal. */
function tablaPortada(scope: GaleriaScope): 'productos' | 'productos_modelo' {
  return scope.columna === 'modelo_id' ? 'productos_modelo' : 'productos';
}

/** Campos ausentes (undefined) = no se modifican. El SKU no es editable. */
export interface ActualizarProductoData {
  categoria_id?: number;
  nombre?: string;
  descripcion?: string;
  precio_regular?: number;
  precio_oferta?: number | null;
  imagen_url?: string | null;
  modelo?: string | null;
  atributos?: Record<string, string>;
  activo?: boolean;
}

const SELECT_PRODUCTO = `
  SELECT
    p.id,
    p.categoria_id,
    c.nombre                     AS categoria_nombre,
    p.sku,
    p.nombre,
    p.descripcion,
    p.precio_regular::float8     AS precio_regular,
    p.precio_oferta::float8      AS precio_oferta,
    p.imagen_url,
    p.modelo,
    p.atributos,
    p.activo,
    COALESCE(i.stock_actual, 0)  AS stock_actual,
    COALESCE(i.stock_minimo, 5)  AS stock_minimo,
    p.creado_en,
    p.actualizado_en
  FROM productos p
  INNER JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN inventario i ON i.producto_id = p.id
`;

export const productRepository = {
  async listar(filtros: ListarProductosQuery): Promise<ProductoRow[]> {
    const search = filtros.search ? `%${filtros.search}%` : null;
    const categoriaId = filtros.categoria_id ?? null;
    const activo = filtros.activo ?? null;
    const stockBajo = filtros.stock_bajo ?? null;

    const query = `
      ${SELECT_PRODUCTO}
      WHERE ($1::text IS NULL OR p.nombre ILIKE $1 OR p.sku ILIKE $1)
        AND ($2::int IS NULL OR p.categoria_id IN (
              WITH RECURSIVE arbol AS (
                SELECT id FROM categorias WHERE id = $2
                UNION ALL
                SELECT c.id FROM categorias c JOIN arbol a ON c.categoria_padre_id = a.id
              )
              SELECT id FROM arbol
            ))
        AND ($3::boolean IS NULL OR p.activo = $3)
        AND ($4::boolean IS NULL OR ($4 = TRUE) = (COALESCE(i.stock_actual, 0) <= COALESCE(i.stock_minimo, 5)))
      ORDER BY p.creado_en DESC
    `;
    const result = await pool.query<ProductoRow>(query, [search, categoriaId, activo, stockBajo]);
    return result.rows;
  },

  async obtenerPorId(id: string): Promise<ProductoRow | null> {
    const result = await pool.query<ProductoRow>(
      `${SELECT_PRODUCTO} WHERE p.id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async existeSku(sku: string, exceptoId: string | null = null): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM productos WHERE sku = $1 AND ($2::uuid IS NULL OR id <> $2)`,
      [sku, exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  /** Un mismo modelo no debe repetir la combinación de atributos (variantes). */
  async existeVariante(
    modelo: string,
    atributos: Record<string, string>,
    exceptoId: string | null = null
  ): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM productos
       WHERE modelo = $1 AND atributos = $2::jsonb AND ($3::uuid IS NULL OR id <> $3)`,
      [modelo, JSON.stringify(atributos), exceptoId]
    );
    return Number(result.rows[0].count) > 0;
  },

  async existeCategoria(id: number): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM categorias WHERE id = $1`,
      [id]
    );
    return Number(result.rows[0].count) > 0;
  },

  /** HU007 CA04 + HU024: inserta producto + su fila de inventario en una transacción. */
  async crear(data: CrearProductoData): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const productResult = await client.query<{ id: string }>(
        `INSERT INTO productos
           (categoria_id, sku, nombre, descripcion, precio_regular, precio_oferta, imagen_url, modelo, atributos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
         RETURNING id`,
        [
          data.categoria_id,
          data.sku,
          data.nombre,
          data.descripcion,
          data.precio_regular,
          data.precio_oferta,
          data.imagen_url,
          data.modelo,
          JSON.stringify(data.atributos),
        ]
      );
      const productoId = productResult.rows[0].id;

      await client.query(
        `INSERT INTO inventario (producto_id, stock_actual, stock_minimo) VALUES ($1, $2, $3)`,
        [productoId, data.stock_inicial, data.stock_minimo]
      );

      await client.query('COMMIT');
      return productoId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * HU028: alta transaccional de varias variantes. Si una inserción falla,
   * se revierte todo el lote. Devuelve los IDs en el mismo orden.
   */
  async crearLote(items: CrearProductoData[]): Promise<string[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ids: string[] = [];
      for (const data of items) {
        const productResult = await client.query<{ id: string }>(
          `INSERT INTO productos
             (categoria_id, sku, nombre, descripcion, precio_regular, precio_oferta, imagen_url, modelo, atributos)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
           RETURNING id`,
          [
            data.categoria_id,
            data.sku,
            data.nombre,
            data.descripcion,
            data.precio_regular,
            data.precio_oferta,
            data.imagen_url,
            data.modelo,
            JSON.stringify(data.atributos),
          ]
        );
        const productoId = productResult.rows[0].id;
        await client.query(
          `INSERT INTO inventario (producto_id, stock_actual, stock_minimo) VALUES ($1, $2, $3)`,
          [productoId, data.stock_inicial, data.stock_minimo]
        );
        ids.push(productoId);
      }
      await client.query('COMMIT');
      return ids;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * HU008: actualización dinámica de la ficha. Solo cambia los campos enviados
   * (undefined = no modificar; null = limpiar). Actualiza `actualizado_en` (CA03).
   * No toca `sku` ni afecta snapshots históricos de pedidos (CA04).
   * HU009: permite el borrado lógico/reactivación vía `activo`.
   */
  async actualizar(id: string, data: ActualizarProductoData): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const add = (column: string, value: unknown): void => {
      sets.push(`${column} = $${idx++}`);
      values.push(value);
    };

    if (data.categoria_id !== undefined) add('categoria_id', data.categoria_id);
    if (data.nombre !== undefined) add('nombre', data.nombre);
    if (data.descripcion !== undefined) add('descripcion', data.descripcion);
    if (data.precio_regular !== undefined) add('precio_regular', data.precio_regular);
    if (data.precio_oferta !== undefined) add('precio_oferta', data.precio_oferta);
    if (data.imagen_url !== undefined) add('imagen_url', data.imagen_url);
    if (data.modelo !== undefined) add('modelo', data.modelo);
    if (data.atributos !== undefined) {
      sets.push(`atributos = $${idx++}::jsonb`);
      values.push(JSON.stringify(data.atributos));
    }
    if (data.activo !== undefined) add('activo', data.activo);

    sets.push('actualizado_en = NOW()');
    values.push(id);

    await pool.query(`UPDATE productos SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },

  // ── HU033: galería de imágenes ──────────────────────────────────────────────

  async listarImagenes(scope: GaleriaScope): Promise<ProductoImagenRow[]> {
    const result = await pool.query<ProductoImagenRow>(
      `SELECT id, producto_id, modelo_id, url, alt, orden, es_principal, creado_en
       FROM producto_imagenes
       WHERE ${scope.columna} = $1
       ORDER BY es_principal DESC, orden ASC, creado_en ASC`,
      [scope.id]
    );
    return result.rows;
  },

  async obtenerImagen(id: string): Promise<ProductoImagenRow | null> {
    const result = await pool.query<ProductoImagenRow>(
      `SELECT id, producto_id, modelo_id, url, alt, orden, es_principal, creado_en
       FROM producto_imagenes WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  /** Inserta una imagen al final. Si es la primera del ámbito, la marca principal. */
  async crearImagen(
    scope: GaleriaScope,
    data: { url: string; alt: string | null; esPrincipal: boolean }
  ): Promise<ProductoImagenRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const max = await client.query<{ next: number }>(
        `SELECT COALESCE(MAX(orden), -1) + 1 AS next FROM producto_imagenes WHERE ${scope.columna} = $1`,
        [scope.id]
      );
      const orden = max.rows[0].next;

      const hayPrincipal = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM producto_imagenes WHERE ${scope.columna} = $1 AND es_principal`,
        [scope.id]
      );
      const esPrincipal = data.esPrincipal || Number(hayPrincipal.rows[0].count) === 0;

      if (esPrincipal) {
        await client.query(
          `UPDATE producto_imagenes SET es_principal = FALSE WHERE ${scope.columna} = $1 AND es_principal`,
          [scope.id]
        );
      }

      const result = await client.query<ProductoImagenRow>(
        `INSERT INTO producto_imagenes (${scope.columna}, url, alt, orden, es_principal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, producto_id, modelo_id, url, alt, orden, es_principal, creado_en`,
        [scope.id, data.url, data.alt, orden, esPrincipal]
      );

      if (esPrincipal) {
        await client.query(`UPDATE ${tablaPortada(scope)} SET imagen_url = $1 WHERE id = $2`, [
          data.url,
          scope.id,
        ]);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /** Marca una imagen como principal y sincroniza la portada del ámbito. */
  async marcarImagenPrincipal(scope: GaleriaScope, imagenId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const imagen = await client.query<{ url: string }>(
        `SELECT url FROM producto_imagenes WHERE id = $1 AND ${scope.columna} = $2`,
        [imagenId, scope.id]
      );
      if (imagen.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query(
        `UPDATE producto_imagenes SET es_principal = FALSE WHERE ${scope.columna} = $1 AND es_principal`,
        [scope.id]
      );
      await client.query(`UPDATE producto_imagenes SET es_principal = TRUE WHERE id = $1`, [imagenId]);
      await client.query(`UPDATE ${tablaPortada(scope)} SET imagen_url = $1 WHERE id = $2`, [
        imagen.rows[0].url,
        scope.id,
      ]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async actualizarImagen(id: string, data: { alt?: string | null; orden?: number }): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.alt !== undefined) {
      sets.push(`alt = $${idx++}`);
      values.push(data.alt);
    }
    if (data.orden !== undefined) {
      sets.push(`orden = $${idx++}`);
      values.push(data.orden);
    }
    if (sets.length === 0) return;
    values.push(id);
    await pool.query(`UPDATE producto_imagenes SET ${sets.join(', ')} WHERE id = $${idx}`, values);
  },

  /** Elimina la imagen; si era principal, promueve la siguiente y sincroniza la portada. */
  async eliminarImagen(scope: GaleriaScope, imagenId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const borrada = await client.query<{ es_principal: boolean }>(
        `DELETE FROM producto_imagenes WHERE id = $1 AND ${scope.columna} = $2 RETURNING es_principal`,
        [imagenId, scope.id]
      );
      if (borrada.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      if (borrada.rows[0].es_principal) {
        const siguiente = await client.query<{ id: string; url: string }>(
          `SELECT id, url FROM producto_imagenes WHERE ${scope.columna} = $1 ORDER BY orden ASC, creado_en ASC LIMIT 1`,
          [scope.id]
        );
        if (siguiente.rows.length > 0) {
          await client.query(`UPDATE producto_imagenes SET es_principal = TRUE WHERE id = $1`, [
            siguiente.rows[0].id,
          ]);
          await client.query(`UPDATE ${tablaPortada(scope)} SET imagen_url = $1 WHERE id = $2`, [
            siguiente.rows[0].url,
            scope.id,
          ]);
        } else {
          await client.query(`UPDATE ${tablaPortada(scope)} SET imagen_url = NULL WHERE id = $1`, [
            scope.id,
          ]);
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
