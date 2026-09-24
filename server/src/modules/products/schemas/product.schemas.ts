import { z } from 'zod';
import { ATRIBUTOS_VARIANTE_KEYS } from '../../../shared/constants/atributos';

/** Atributos de variante admitidos en `productos.atributos` (HU007/008). */
export { ATRIBUTOS_VARIANTE_KEYS };

/** Mapa de atributos de variante: { COLOR: 'Negro', SIZE: 'M', … } */
const atributosSchema = z.record(z.string().trim().max(100)).optional();

/** Body de POST /api/v1/products (HU007/HU024) */
export const crearProductoSchema = z
  .object({
    categoria_id: z.number().int().positive({ message: 'Selecciona una categoría' }),
    // HU031: opcional; si la categoría tiene plantilla, el backend lo genera.
    sku: z.string().trim().min(3, { message: 'Mínimo 3 caracteres' }).max(50).optional(),
    nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(150),
    descripcion: z.string().trim().min(1, { message: 'La descripción es obligatoria' }).max(1000),
    precio_regular: z.number().positive({ message: 'El precio debe ser mayor a 0' }),
    precio_oferta: z.number().positive({ message: 'El precio de oferta debe ser mayor a 0' }).optional(),
    imagen_url: z.string().trim().url({ message: 'URL inválida' }).max(500).optional().or(z.literal('')),
    // Variantes: modelo (familia) y atributos (color/talla/capacidad…)
    modelo: z.string().trim().max(255).optional(),
    atributos: atributosSchema,
    // HU024: existencias iniciales de la fila `inventario` (por defecto 0/5).
    stock_inicial: z.number().int().min(0, { message: 'El stock no puede ser negativo' }).optional(),
    stock_minimo: z.number().int().min(0, { message: 'El stock mínimo no puede ser negativo' }).optional(),
  })
  .refine((data) => data.precio_oferta === undefined || data.precio_oferta < data.precio_regular, {
    message: 'El precio de oferta debe ser menor que el precio regular',
    path: ['precio_oferta'],
  });

/** Máximo de variantes por alta masiva (HU028). */
export const MAX_VARIANTES_LOTE = 200;

/** Body de POST /api/v1/products/bulk (HU028) — alta transaccional de variantes. */
export const crearProductosLoteSchema = z.object({
  productos: z
    .array(crearProductoSchema)
    .min(1, { message: 'Debes incluir al menos una variante' })
    .max(MAX_VARIANTES_LOTE, { message: `Máximo ${MAX_VARIANTES_LOTE} variantes por lote` }),
});

/** Query de GET /api/v1/products */
export const listarProductosQuerySchema = z.object({
  search: z.string().trim().min(1).max(150).optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  stock_bajo: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

/** Body de PATCH /api/v1/products/:id (HU008/HU009) — no permite cambiar el SKU */
export const actualizarProductoSchema = z
  .object({
    categoria_id: z.number().int().positive({ message: 'Categoría inválida' }).optional(),
    // HU009: borrado lógico (activo = FALSE) / reactivación (activo = TRUE)
    activo: z.boolean({ message: 'El estado debe ser booleano' }).optional(),
    nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(150).optional(),
    descripcion: z.string().trim().min(1, { message: 'La descripción es obligatoria' }).max(1000).optional(),
    precio_regular: z.number().positive({ message: 'El precio debe ser mayor a 0' }).optional(),
    // null = quitar la oferta; ausente = no modificar
    precio_oferta: z.preprocess(
      (v) => (v === '' || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.number().positive({ message: 'El precio de oferta debe ser mayor a 0' }).nullable().optional()
    ),
    imagen_url: z.string().trim().url({ message: 'URL inválida' }).max(500).optional().or(z.literal('')),
    // null/'' = quitar el modelo; ausente = no modificar
    modelo: z.string().trim().max(255).nullable().optional(),
    atributos: atributosSchema,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const productoIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de producto inválido' }),
});

/** Body de POST /api/v1/products/:id/images (HU033) — url o archivo en base64. */
export const agregarImagenSchema = z
  .object({
    url: z.string().trim().url({ message: 'URL inválida' }).max(600).optional(),
    data: z.string().trim().optional(),
    alt: z.string().trim().max(150).optional(),
    es_principal: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.url) || Boolean(d.data), {
    message: 'Envía una URL o un archivo (data)',
  });

/** Body de PATCH /api/v1/products/:id/images/:imagenId (HU033). */
export const actualizarImagenSchema = z
  .object({
    alt: z.string().trim().max(150).nullable().optional(),
    orden: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

/** Params de /api/v1/products/:id/images/:imagenId (HU033). */
export const imagenParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de producto inválido' }),
  imagenId: z.string().uuid({ message: 'Identificador de imagen inválido' }),
});

export type AgregarImagenInput = z.infer<typeof agregarImagenSchema>;
export type ActualizarImagenInput = z.infer<typeof actualizarImagenSchema>;

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type CrearProductosLoteInput = z.infer<typeof crearProductosLoteSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
export type ListarProductosQuery = z.infer<typeof listarProductosQuerySchema>;
