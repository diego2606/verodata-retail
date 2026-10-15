import { z } from 'zod';

export type BannerUbicacion = 'HERO' | 'TICKER' | 'BANDA_EDITORIAL';

/** Cadenas vacías se normalizan a null (campo opcional sin valor). */
const fechaOpcional = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.string().trim().nullable()
);

const textoCorto = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.string().trim().max(255).nullable()
);

/** Sobre-título del banner (eyebrow), más corto que el subtítulo. */
const textoEtiqueta = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.string().trim().max(80).nullable()
);

export const crearBannerSchema = z.object({
  ubicacion: z.enum(['HERO', 'TICKER', 'BANDA_EDITORIAL']),
  titulo: z.string().trim().min(1, { message: 'El título es obligatorio' }).max(150),
  etiqueta: textoEtiqueta.optional(),
  subtitulo: textoCorto.optional(),
  cta_texto: z
    .preprocess((v) => (v === '' || v === undefined ? null : v), z.string().trim().max(40).nullable())
    .optional(),
  cta_url: z
    .preprocess((v) => (v === '' || v === undefined ? null : v), z.string().trim().max(255).nullable())
    .optional(),
  imagen_url: z.string().trim().url({ message: 'URL de imagen inválida' }).max(600),
  orden: z.number().int().min(0).optional(),
  activo: z.boolean().optional(),
  vigente_desde: fechaOpcional.optional(),
  vigente_hasta: fechaOpcional.optional(),
});

export const actualizarBannerSchema = z
  .object({
    ubicacion: z.enum(['HERO', 'TICKER', 'BANDA_EDITORIAL']).optional(),
    titulo: z.string().trim().min(1).max(150).optional(),
    etiqueta: textoEtiqueta.optional(),
    subtitulo: textoCorto.optional(),
    cta_texto: z
      .preprocess((v) => (v === '' || v === undefined ? null : v), z.string().trim().max(40).nullable())
      .optional(),
    cta_url: z
      .preprocess((v) => (v === '' || v === undefined ? null : v), z.string().trim().max(255).nullable())
      .optional(),
    imagen_url: z.string().trim().url({ message: 'URL de imagen inválida' }).max(600).optional(),
    orden: z.number().int().min(0).optional(),
    activo: z.boolean().optional(),
    vigente_desde: fechaOpcional.optional(),
    vigente_hasta: fechaOpcional.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

export const reordenarBannersSchema = z.object({
  ids: z.array(z.string().uuid({ message: 'Identificador inválido' })).min(1),
});

export const listarBannersQuerySchema = z.object({
  ubicacion: z.enum(['HERO', 'TICKER', 'BANDA_EDITORIAL']).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const bannerIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de banner inválido' }),
});

export type CrearBannerInput = z.infer<typeof crearBannerSchema>;
export type ActualizarBannerInput = z.infer<typeof actualizarBannerSchema>;
export type ListarBannersQuery = z.infer<typeof listarBannersQuerySchema>;
