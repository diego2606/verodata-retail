import { z } from 'zod';
import { passwordSchema } from '../../auth/schemas/auth.schemas';

const tipoDocumentoSchema = z.enum(['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA']);

/** PATCH /api/v1/me — datos personales del cliente (el email no se cambia aquí). */
export const actualizarPerfilSchema = z
  .object({
    nombres: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100).optional(),
    apellidos: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100).optional(),
    telefono: z.string().trim().min(9, { message: 'Teléfono inválido' }).max(20).optional(),
    tipo_documento: tipoDocumentoSchema.optional(),
    numero_documento: z.string().trim().min(6).max(20).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

/** PATCH /api/v1/me/password */
export const cambiarPasswordSchema = z.object({
  password_actual: z.string().min(1, { message: 'Ingresa tu contraseña actual' }),
  password_nueva: passwordSchema,
});

export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
