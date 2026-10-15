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

/** HU034: banner vigente que consume la portada pública. */
export interface BannerVigenteRow {
  id: string;
  ubicacion: 'HERO' | 'TICKER' | 'BANDA_EDITORIAL';
  titulo: string;
  etiqueta: string | null;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  imagen_url: string;
  orden: number;
}

/** HU034: par clave/valor de configuración del sitio. */
export interface ConfigFila {
  clave: string;
  valor: unknown;
}

/** Color activo para los swatches del Storefront. */
export interface ColorFila {
  nombre: string;
  slug: string;
  hex: string;
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
       ORDER BY orden ASC, nombre ASC`
    );
    return result.rows;
  },

  /** HU034 CA05: banners activos y dentro de su vigencia. */
  async listarBannersVigentes(): Promise<BannerVigenteRow[]> {
    const result = await pool.query<BannerVigenteRow>(
      `SELECT id, ubicacion, titulo, etiqueta, subtitulo, cta_texto, cta_url, imagen_url, orden
       FROM banners
       WHERE activo = TRUE
         AND (vigente_desde IS NULL OR vigente_desde <= NOW())
         AND (vigente_hasta IS NULL OR vigente_hasta >= NOW())
       ORDER BY ubicacion ASC, orden ASC, creado_en ASC`
    );
    return result.rows;
  },

  /** HU034: textos y franjas globales de la tienda. */
  async listarConfig(): Promise<ConfigFila[]> {
    const result = await pool.query<ConfigFila>(`SELECT clave, valor FROM sitio_config`);
    return result.rows;
  },

  /** HU034 CA03: productos curados para la portada. */
  async listarDestacados(): Promise<CatalogoFila[]> {
    const result = await pool.query<CatalogoFila>(
      `${SELECT_CATALOGO}
       WHERE p.activo = TRUE AND c.activo = TRUE AND p.destacado = TRUE
       ORDER BY p.destacado_orden ASC NULLS LAST, p.creado_en DESC
       LIMIT 12`
    );
    return result.rows;
  },

  /**
   * Colores activos (nombre + hex) para los swatches de la tienda (HU036).
   * La fuente es el maestro de atributos (`atributo_valores` con código COLOR);
   * la antigua tabla `colores` quedó obsoleta y se eliminó en la migración 020.
   */
  async listarColoresActivos(): Promise<ColorFila[]> {
    const result = await pool.query<ColorFila>(
      `SELECT v.valor AS nombre, v.slug, v.hex
         FROM atributo_valores v
         INNER JOIN atributos a ON a.id = v.atributo_id
        WHERE a.codigo = 'COLOR' AND a.activo = TRUE AND v.activo = TRUE
        ORDER BY v.valor ASC`
    );
    return result.rows;
  },
};
