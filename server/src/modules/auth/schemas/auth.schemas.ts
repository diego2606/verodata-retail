import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
});

export const registroSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .regex(/^(?=.*[A-Z])(?=.*[0-9])/, { message: 'Debe contener al menos una mayúscula y un número' }),
  id_rol: z.number().int().positive({ message: 'Rol inválido' }),
  nombres: z.string().min(2).max(100),
  apellidos: z.string().min(2).max(100),
  tipo_documento: z.enum(['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA']),
  numero_documento: z.string().min(6).max(20),
  telefono: z.string().min(9).max(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;
