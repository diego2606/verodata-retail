import { z } from 'zod';

export const ESTADOS_REPOSICION = ['PENDIENTE', 'RECIBIDO', 'CANCELADO'] as const;
export type EstadoReposicion = (typeof ESTADOS_REPOSICION)[number];

/** Máximo de líneas por orden (protege el sistema). */
export const MAX_DETALLES_REPOSICION = 200;

const fechaIsoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida (formato YYYY-MM-DD)' })
  .nullable()
  .optional();

const detalleSchema = z.object({
  producto_id: z.string().uuid({ message: 'Producto inválido' }),
  costo_unitario: z
    .number()
    .nonnegative({ message: 'El costo no puede ser negativo' })
    .max(1_000_000),
  cantidad_pedida: z
    .number()
    .int()
    .positive({ message: 'La cantidad debe ser mayor a 0' })
    .max(100_000),
});

/**
 * Body de POST /api/v1/reposiciones (HU036 CA02).
 * No se envía el estado: la orden nace siempre `PENDIENTE`.
 */
export const crearReposicionSchema = z
  .object({
    proveedor_id: z.string().uuid({ message: 'Selecciona un proveedor' }),
    fecha_estimada_arribo: fechaIsoSchema,
    notas: z.string().trim().max(2000).nullable().optional(),
    detalles: z
      .array(detalleSchema)
      .min(1, { message: 'Agrega al menos un producto' })
      .max(MAX_DETALLES_REPOSICION),
  })
  .refine(
    (d) => new Set(d.detalles.map((item) => item.producto_id)).size === d.detalles.length,
    { message: 'No repitas el mismo producto en la orden', path: ['detalles'] }
  );

/** Query de GET /api/v1/reposiciones (historial paginado). */
export const listarReposicionesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(ESTADOS_REPOSICION).optional(),
  proveedor_id: z.string().uuid({ message: 'Proveedor inválido' }).optional(),
});

/** Body de PATCH /api/v1/reposiciones/:id/cancelar. */
export const cancelarReposicionSchema = z.object({
  motivo: z.string().trim().max(500).nullable().optional(),
});

export const reposicionIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de orden inválido' }),
});

export type CrearReposicionInput = z.infer<typeof crearReposicionSchema>;
export type ListarReposicionesQuery = z.infer<typeof listarReposicionesQuerySchema>;
export type CancelarReposicionInput = z.infer<typeof cancelarReposicionSchema>;
