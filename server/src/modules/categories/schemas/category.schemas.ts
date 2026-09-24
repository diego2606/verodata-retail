import { z } from 'zod';

/** Body de POST /api/v1/categories (HU006) */
export const crearCategoriaSchema = z.object({
  nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100),
  // Opcional: si no llega, el servicio lo genera desde el nombre (CA02).
  slug: z.string().trim().max(120).optional(),
  descripcion: z.string().trim().max(500).optional(),
});

/** Body de PATCH /api/v1/categories/:id (HU006) — permite cambio de estado */
export const actualizarCategoriaSchema = z
  .object({
    nombre: z.string().trim().min(2).max(100).optional(),
    slug: z.string().trim().max(120).optional(),
    descripcion: z.string().trim().max(500).optional(),
    activo: z.boolean().optional(),
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
