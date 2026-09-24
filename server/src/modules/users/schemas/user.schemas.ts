import { z } from 'zod';

export const tipoDocumentoSchema = z.enum(['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA']);
export const rolUsuarioSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'CLIENTE']);

/** Query params de GET /api/v1/users */
export const listarUsuariosQuerySchema = z.object({
  search: z.string().trim().min(1).max(150).optional(),
  rol: rolUsuarioSchema.optional(),
  // Llega como string en la query ("true" | "false"); se coacciona a boolean.
  bloqueado: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

/** Body de POST /api/v1/users — creación de personal interno (HU002) */
export const crearUsuarioSchema = z.object({
  id_rol: z.number().int().positive({ message: 'Rol inválido' }),
  tipo_documento: tipoDocumentoSchema,
  numero_documento: z
    .string()
    .trim()
    .min(6, { message: 'El documento debe tener al menos 6 caracteres' })
    .max(20, { message: 'El documento no puede exceder 20 caracteres' }),
  nombres: z.string().trim().min(2).max(100),
  apellidos: z.string().trim().min(2).max(100),
  email: z.string().trim().email({ message: 'Email inválido' }).max(150),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .regex(/^(?=.*[A-Z])(?=.*[0-9])/, {
      message: 'Debe contener al menos una mayúscula y un número',
    }),
  telefono: z.string().trim().min(9).max(20).optional(),
});

/** Body de PATCH /api/v1/users/:id/bloqueo */
export const actualizarBloqueoSchema = z.object({
  bloqueado: z.boolean(),
});

/** Query de GET /api/v1/users/search (HU004) */
export const buscarDocumentoQuerySchema = z.object({
  documento: z
    .string()
    .trim()
    .min(6, { message: 'Documento inválido' })
    .max(20, { message: 'Documento inválido' }),
});

/** Body de PATCH /api/v1/users/:id (HU005) — no permite cambiar password ni rol */
export const actualizarUsuarioSchema = z
  .object({
    email: z.string().trim().email({ message: 'Email inválido' }).max(150).optional(),
    nombres: z.string().trim().min(2).max(100).optional(),
    apellidos: z.string().trim().min(2).max(100).optional(),
    telefono: z.string().trim().min(9).max(20).optional(),
    tipo_documento: tipoDocumentoSchema.optional(),
    numero_documento: z.string().trim().min(6).max(20).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const usuarioIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de usuario inválido' }),
});

export type ListarUsuariosQuery = z.infer<typeof listarUsuariosQuerySchema>;
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarBloqueoInput = z.infer<typeof actualizarBloqueoSchema>;
export type BuscarDocumentoQuery = z.infer<typeof buscarDocumentoQuerySchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
