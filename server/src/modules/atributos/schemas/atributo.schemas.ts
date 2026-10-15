import { z } from 'zod';

export const tipoAtributoSchema = z.enum(['TEXTO', 'COLOR', 'NUMERO', 'BOOLEANO']);

const hexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: 'Hex inválido (ej. #FF0000)' })
  .transform((v) => v.toUpperCase());

export const crearAtributoSchema = z.object({
  // Opcional: si no llega, se deriva del nombre (UPPER_SNAKE).
  codigo: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]+$/, { message: 'Usa MAYÚSCULAS y guion bajo (ej. TALLA_CALZADO)' })
    .max(40)
    .optional(),
  nombre: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(60),
  tipo: tipoAtributoSchema,
  es_variante: z.boolean().optional(),
  unidad: z.string().trim().max(12).nullable().optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
});

export const actualizarAtributoSchema = z
  .object({
    nombre: z.string().trim().min(2).max(60).optional(),
    tipo: tipoAtributoSchema.optional(),
    es_variante: z.boolean().optional(),
    unidad: z.string().trim().max(12).nullable().optional(),
    activo: z.boolean().optional(),
    orden: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const crearValorSchema = z.object({
  valor: z.string().trim().min(1, { message: 'El valor es obligatorio' }).max(60),
  hex: hexSchema.nullable().optional(),
  meta: z.record(z.unknown()).nullable().optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
});

export const actualizarValorSchema = z
  .object({
    valor: z.string().trim().min(1).max(60).optional(),
    hex: hexSchema.nullable().optional(),
    meta: z.record(z.unknown()).nullable().optional(),
    activo: z.boolean().optional(),
    orden: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const atributoIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Identificador de atributo inválido' }),
});

export const valorIdParamSchema = z.object({
  valorId: z.coerce.number().int().positive({ message: 'Identificador de valor inválido' }),
});

export type CrearAtributoInput = z.infer<typeof crearAtributoSchema>;
export type ActualizarAtributoInput = z.infer<typeof actualizarAtributoSchema>;
export type CrearValorInput = z.infer<typeof crearValorSchema>;
export type ActualizarValorInput = z.infer<typeof actualizarValorSchema>;
