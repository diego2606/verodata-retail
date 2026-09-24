import { z } from 'zod';

/** Hex en formato #RRGGBB (se normaliza a mayúsculas). */
const hexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: 'Hex inválido (ej. #FF0000)' })
  .transform((v) => v.toUpperCase());

export const crearColorSchema = z.object({
  nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(60),
  hex: hexSchema,
});

export const actualizarColorSchema = z
  .object({
    nombre: z.string().trim().min(2).max(60).optional(),
    hex: hexSchema.optional(),
    activo: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const listarColoresQuerySchema = z.object({
  search: z.string().trim().min(1).max(60).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const colorIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Identificador de color inválido' }),
});

export type CrearColorInput = z.infer<typeof crearColorSchema>;
export type ActualizarColorInput = z.infer<typeof actualizarColorSchema>;
export type ListarColoresQuery = z.infer<typeof listarColoresQuerySchema>;
