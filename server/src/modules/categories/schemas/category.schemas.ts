import { z } from 'zod';
import { ATRIBUTOS_VARIANTE_KEYS, SKU_SEGMENTOS } from '../../../shared/constants/atributos';

/** Atributos de variante que una categoría puede permitir (HU029). */
const atributosPermitidosSchema = z
  .array(z.enum(ATRIBUTOS_VARIANTE_KEYS))
  .nullable()
  .optional();

/** Valores sugeridos por atributo (HU030): { COLOR: ['Negro','Blanco'] }. */
const atributosValoresSchema = z
  .record(z.enum(ATRIBUTOS_VARIANTE_KEYS), z.array(z.string().trim().min(1).max(100)))
  .nullable()
  .optional();

/** Plantilla de SKU estructurado (HU031). */
const skuSegmentosSchema = z.array(z.enum(SKU_SEGMENTOS)).nullable().optional();
const skuPrefijoSchema = z.string().trim().max(6).nullable().optional();

/** Body de POST /api/v1/categories (HU006/HU029) */
export const crearCategoriaSchema = z.object({
  nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100),
  // Opcional: si no llega, el servicio lo genera desde el nombre (CA02).
  slug: z.string().trim().max(120).optional(),
  descripcion: z.string().trim().max(500).optional(),
  // Jerarquía: null/omitido = categoría raíz (HU006 CA01).
  categoria_padre_id: z.number().int().positive().nullable().optional(),
  // HU029: null/omitido = heredar atributos del ancestro más cercano.
  atributos_permitidos: atributosPermitidosSchema,
  // HU030: valores sugeridos por atributo (null/omitido = heredar).
  atributos_valores: atributosValoresSchema,
  // HU031: SKU estructurado (null/omitido = sin plantilla / no cambiar).
  sku_prefijo: skuPrefijoSchema,
  sku_segmentos: skuSegmentosSchema,
});

/** Body de PATCH /api/v1/categories/:id (HU006/HU029) — permite cambio de estado y de padre */
export const actualizarCategoriaSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    slug: z.string().trim().max(120).optional(),
    descripcion: z.string().trim().max(500).optional(),
    activo: z.boolean().optional(),
    // null = mover a raíz; omitido = no cambiar.
    categoria_padre_id: z.number().int().positive().nullable().optional(),
    // null = volver a heredar; omitido = no cambiar.
    atributos_permitidos: atributosPermitidosSchema,
    atributos_valores: atributosValoresSchema,
    // null = volver a heredar; omitido = no cambiar.
    sku_prefijo: skuPrefijoSchema,
    sku_segmentos: skuSegmentosSchema,
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

/** Query de GET /api/v1/categories */
export const listarCategoriasQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const categoriaIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Identificador de categoría inválido' }),
});

export type CrearCategoriaInput = z.infer<typeof crearCategoriaSchema>;
export type ActualizarCategoriaInput = z.infer<typeof actualizarCategoriaSchema>;
export type ListarCategoriasQuery = z.infer<typeof listarCategoriasQuerySchema>;
