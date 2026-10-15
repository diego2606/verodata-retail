import { z } from 'zod';

/** Valor JSONB editable (string, número, booleano, arreglo u objeto). */
export const actualizarConfigSchema = z.object({
  valor: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.unknown()),
    z.record(z.unknown()),
  ]),
});

export const configClaveParamSchema = z.object({
  clave: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/, { message: 'Clave inválida (usa minúsculas y guion bajo)' }),
});

export type ActualizarConfigInput = z.infer<typeof actualizarConfigSchema>;
