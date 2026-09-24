import { z } from 'zod';

/** Body de POST /api/v1/products (HU007) */
export const crearProductoSchema = z
  .object({
    categoria_id: z.number().int().positive({ message: 'Selecciona una categoría' }),
    sku: z.string().trim().min(3, { message: 'Mínimo 3 caracteres' }).max(50),
    nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(150),
    descripcion: z.string().trim().min(1, { message: 'La descripción es obligatoria' }).max(1000),
    precio_regular: z.number().positive({ message: 'El precio debe ser mayor a 0' }),
    precio_oferta: z.number().positive({ message: 'El precio de oferta debe ser mayor a 0' }).optional(),
    imagen_url: z.string().trim().url({ message: 'URL inválida' }).max(500).optional().or(z.literal('')),
  })
  .refine((data) => data.precio_oferta === undefined || data.precio_oferta < data.precio_regular, {
    message: 'El precio de oferta debe ser menor que el precio regular',
    path: ['precio_oferta'],
  });

/** Query de GET /api/v1/products */
export const listarProductosQuerySchema = z.object({
  search: z.string().trim().min(1).max(150).optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const productoIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de producto inválido' }),
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ListarProductosQuery = z.infer<typeof listarProductosQuerySchema>;
