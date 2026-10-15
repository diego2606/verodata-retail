import { z } from 'zod';

/** Query de GET /api/v1/storefront/products (HU013/HU016). */
export const listarCatalogoQuerySchema = z.object({
  search: z.string().trim().min(1).max(150).optional(),
  categoria_id: z.coerce.number().int().positive().optional(),
  precio_min: z.coerce.number().nonnegative().optional(),
  precio_max: z.coerce.number().nonnegative().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(60).default(24),
});

/** Params de GET /api/v1/storefront/products/:id */
export const productoIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de producto inválido' }),
});

export type ListarCatalogoQuery = z.infer<typeof listarCatalogoQuerySchema>;
