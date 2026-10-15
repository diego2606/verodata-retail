import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
  // true → token de larga duración (persistir sesión)
  recordar: z.boolean().optional(),
});

/** Política de contraseña: mínimo 8, una mayúscula y un número. */
export const passwordSchema = z
  .string()
  .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  .max(72, { message: 'La contraseña es demasiado larga' })
  .regex(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Debe contener al menos una mayúscula y un número',
  });

/** POST /api/v1/auth/registro — alta de cliente (registro directo). */
export const registroClienteSchema = z.object({
  tipo_documento: z.enum(['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA']),
  numero_documento: z
    .string()
    .trim()
    .min(6, { message: 'El documento debe tener al menos 6 caracteres' })
    .max(20, { message: 'El documento no puede exceder 20 caracteres' }),
  nombres: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100),
  apellidos: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100),
  email: z.string().trim().email({ message: 'Email inválido' }).max(150),
  password: passwordSchema,
  telefono: z.string().trim().min(9, { message: 'Teléfono inválido' }).max(20).optional(),
});

/** POST /api/v1/auth/recuperar */
export const recuperarPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'Email inválido' }).max(150),
});

/** POST /api/v1/auth/restablecer */
export const restablecerPasswordSchema = z.object({
  token: z.string().trim().min(10, { message: 'Token inválido' }).max(200),
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroClienteInput = z.infer<typeof registroClienteSchema>;
export type RecuperarPasswordInput = z.infer<typeof recuperarPasswordSchema>;
export type RestablecerPasswordInput = z.infer<typeof restablecerPasswordSchema>;
