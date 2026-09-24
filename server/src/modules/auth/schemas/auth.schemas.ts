import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
  // true → token de larga duración (persistir sesión)
  recordar: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
