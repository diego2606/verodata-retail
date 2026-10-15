import { z } from 'zod';

/** Mapa de atributos de la variante: { COLOR: 'Negro', SIZE: '42' }. */
const atributosSchema = z.record(z.string().trim().max(100));

/** Máximo de variantes por operación delta (protege el sistema). */
export const MAX_VARIANTES_DELTA = 200;

/** Precio de oferta: '' se normaliza a null; null = sin oferta. */
const precioOfertaSchema = z
  .preprocess((v) => (v === '' ? null : v), z.number().positive().max(1_000_000).nullable())
  .optional();

/** Body de POST /api/v1/product-models — el Producto Padre (Modelo). */
export const crearModeloSchema = z.object({
  categoria_id: z.number().int().positive({ message: 'Selecciona una categoría' }),
  nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(150),
  marca: z.string().trim().max(80).nullable().optional(),
  modelo_codigo: z.string().trim().max(60).nullable().optional(),
  descripcion: z.string().trim().max(2000).nullable().optional(),
  // Ejes de variante (subconjunto de los atributos efectivos de la categoría).
  atributos_variantes: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  activo: z.boolean().optional(),
});

/** Body de PATCH /api/v1/product-models/:id — datos comunes del padre. */
export const actualizarModeloSchema = z
  .object({
    categoria_id: z.number().int().positive().optional(),
    nombre: z.string().trim().min(2).max(150).optional(),
    marca: z.string().trim().max(80).nullable().optional(),
    modelo_codigo: z.string().trim().max(60).nullable().optional(),
    descripcion: z.string().trim().max(2000).nullable().optional(),
    atributos_variantes: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

/** Variante nueva (SKU hijo) dentro del delta. */
export const nuevaVarianteSchema = z
  .object({
    atributos: atributosSchema,
    // Opcional: si la categoría tiene plantilla de SKU (HU031), se genera.
    sku: z.string().trim().min(3, { message: 'Mínimo 3 caracteres' }).max(50).optional(),
    codigo_barras: z.string().trim().min(6).max(50).nullable().optional(),
    precio_regular: z.number().positive({ message: 'El precio debe ser mayor a 0' }).max(1_000_000),
    precio_oferta: precioOfertaSchema,
    stock_actual: z.number().int().min(0, { message: 'El stock no puede ser negativo' }),
    stock_minimo: z.number().int().min(0).optional(),
  })
  .refine((d) => d.precio_oferta == null || d.precio_oferta < d.precio_regular, {
    message: 'El precio de oferta debe ser menor que el precio regular',
    path: ['precio_oferta'],
  });

/** Variante existente a actualizar: el SKU y los atributos NO viajan (inmutables). */
export const actualizarVarianteSchema = z
  .object({
    sku_id: z.string().uuid({ message: 'Identificador de variante inválido' }),
    precio_regular: z.number().positive().max(1_000_000).optional(),
    precio_oferta: precioOfertaSchema,
    stock_actual: z.number().int().min(0).optional(),
    stock_minimo: z.number().int().min(0).optional(),
    codigo_barras: z.string().trim().min(6).max(50).nullable().optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => Object.entries(d).some(([clave, v]) => clave !== 'sku_id' && v !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

/** Body de POST /api/v1/product-models/:id/variantes/delta (HU035 CA08). */
export const deltaVariantesSchema = z.object({
  nuevas_variantes: z.array(nuevaVarianteSchema).max(MAX_VARIANTES_DELTA).default([]),
  actualizar_variantes: z.array(actualizarVarianteSchema).max(500).default([]),
  eliminar_variantes: z.array(z.string().uuid()).max(MAX_VARIANTES_DELTA).default([]),
});

export const modeloIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de producto inválido' }),
});

export const skuIdParamSchema = z.object({
  skuId: z.string().uuid({ message: 'Identificador de variante inválido' }),
});

export type CrearModeloInput = z.infer<typeof crearModeloSchema>;
export type ActualizarModeloInput = z.infer<typeof actualizarModeloSchema>;
export type NuevaVarianteInput = z.infer<typeof nuevaVarianteSchema>;
export type ActualizarVarianteInput = z.infer<typeof actualizarVarianteSchema>;
export type DeltaVariantesInput = z.infer<typeof deltaVariantesSchema>;
