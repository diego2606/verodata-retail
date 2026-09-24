import { z } from 'zod';

/** Body de PATCH /api/v1/inventory/:productoId (HU010). */
export const ajustarInventarioSchema = z.object({
  // Entero con signo: positivo = ingreso (compra a proveedor), negativo = merma/ajuste.
  ajuste: z
    .number()
    .int({ message: 'El ajuste debe ser un número entero' })
    .refine((value) => value !== 0, { message: 'El ajuste no puede ser 0' }),
  stock_minimo: z
    .number()
    .int()
    .min(0, { message: 'El stock mínimo no puede ser negativo' })
    .optional(),
});

export const inventarioProductoParamSchema = z.object({
  productoId: z.string().uuid({ message: 'Identificador de producto inválido' }),
});

export type AjustarInventarioInput = z.infer<typeof ajustarInventarioSchema>;
