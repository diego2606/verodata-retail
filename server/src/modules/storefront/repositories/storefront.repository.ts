import pool from '../../../config/db';
import { ListarCatalogoQuery } from '../schemas/storefront.schemas';

/** Fila cruda del catálogo público (producto + categoría + stock). */
export interface CatalogoFila {
  id: string;
  categoria_id: number;
  categoria_nombre: string;
  categoria_slug: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_regular: number;
  precio_oferta: number | null;
  imagen_url: string | null;
  modelo: string | null;
  atributos: Record<string, string>;
  stock_actual: number;
  creado_en: Date;
}

/** Categoría activa para la navegación pública. */
export interface CategoriaPublicaFila {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  categoria_padre_id: number | null;
}

/**
 * HU013 CA01: solo productos activos pertenecientes a categorías activas.
 * El filtro por categoría incluye sus descendientes (consulta recursiva, HU025).
 */
const SELECT_CATALOGO = `
  SELECT
    p.id,
    p.categoria_id,
    c.nombre                     AS categoria_nombre,
    c.slug                       AS categoria_slug,
    p.sku,
    p.nombre,
    p.descripcion,
    p.precio_regular::float8     AS precio_regular,
    p.precio_oferta::float8      AS precio_oferta,
    p.imagen_url,
    p.modelo,
    p.atributos,
    COALESCE(i.stock_actual, 0)  AS stock_actual,
    p.creado_en
  FROM productos p
  INNER JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN inventario i ON i.producto_id = p.id
`;

export const storefrontRepository = {
  async listarCatalogo(filtros: ListarCatalogoQuery): Promise<CatalogoFila[]> {
    const search = filtros.search ? `%${filtros.search}%` : null;
    const categoriaId = filtros.categoria_id ?? null;

    const query = `
      ${SELECT_CATALOGO}
      WHERE p.activo = TRUE
        AND c.activo = TRUE
        AND ($1::text IS NULL OR p.nombre ILIKE $1 OR p.sku ILIKE $1
             OR p.descripcion ILIKE $1 OR p.modelo ILIKE $1)
        AND ($2::int IS NULL OR p.categoria_id IN (
              WITH RECURSIVE arbol AS (
                SELECT id FROM categorias WHERE id = $2
                UNION ALL
                SELECT c.id FROM categorias c JOIN arbol a ON c.categoria_padre_id = a.id
              )
              SELECT id FROM arbol
            ))
      ORDER BY p.creado_en DESC
    `;
    const result = await pool.query<CatalogoFila>(query, [search, categoriaId]);
    return result.rows;
  },

  async obtenerPorId(id: string): Promise<CatalogoFila | null> {
    const result = await pool.query<CatalogoFila>(
      `${SELECT_CATALOGO} WHERE p.id = $1 AND p.activo = TRUE AND c.activo = TRUE LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  /** Variantes hermanas del mismo modelo (para cambiar color/talla/capacidad). */
  async listarHermanas(modelo: string, exceptoId: string): Promise<CatalogoFila[]> {
    const result = await pool.query<CatalogoFila>(
      `${SELECT_CATALOGO}
       WHERE p.modelo = $1 AND p.id <> $2 AND p.activo = TRUE AND c.activo = TRUE
       ORDER BY p.atributos->>'SIZE' ASC NULLS FIRST, p.creado_en ASC`,
      [modelo, exceptoId]
    );
    return result.rows;
  },

  async listarCategoriasActivas(): Promise<CategoriaPublicaFila[]> {
    const result = await pool.query<CategoriaPublicaFila>(
      `SELECT id, nombre, slug, descripcion, categoria_padre_id
       FROM categorias
       WHERE activo = TRUE
       ORDER BY nombre ASC`
    );
    return result.rows;
  },
};
