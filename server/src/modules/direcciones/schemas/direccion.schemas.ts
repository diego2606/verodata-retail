import { z } from 'zod';

const direccionBase = {
  departamento: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100),
  provincia: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100),
  distrito: z.string().trim().min(2, { message: 'Mínimo 2 caracteres' }).max(100),
  direccion_linea: z.string().trim().min(3, { message: 'Ingresa la dirección' }).max(200),
  referencia: z
    .preprocess((v) => (v === '' || v === undefined ? null : v), z.string().trim().max(200).nullable())
    .optional(),
  codigo_postal: z
    .preprocess((v) => (v === '' || v === undefined ? null : v), z.string().trim().max(20).nullable())
    .optional(),
  // Geolocalización opcional (migración 012). Se envía solo si el usuario usó el mapa.
  latitud: z
    .preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z.number().min(-90, { message: 'Latitud fuera de rango' }).max(90, { message: 'Latitud fuera de rango' }).nullable()
    )
    .optional(),
  longitud: z
    .preprocess(
      (v) => (v === '' || v === undefined ? null : v),
      z
        .number()
        .min(-180, { message: 'Longitud fuera de rango' })
        .max(180, { message: 'Longitud fuera de rango' })
        .nullable()
    )
    .optional(),
  es_principal: z.boolean().optional(),
};

/** POST /api/v1/me/direcciones */
export const crearDireccionSchema = z.object(direccionBase);

/** PATCH /api/v1/me/direcciones/:id */
export const actualizarDireccionSchema = z
  .object(direccionBase)
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const direccionIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de dirección inválido' }),
});

export type CrearDireccionInput = z.infer<typeof crearDireccionSchema>;
export type ActualizarDireccionInput = z.infer<typeof actualizarDireccionSchema>;
