import { z } from 'zod';

/** Body de POST /api/v1/proveedores (HU036). */
export const crearProveedorSchema = z.object({
  nombre_empresa: z
    .string()
    .trim()
    .min(2, { message: 'Mínimo 2 caracteres' })
    .max(150),
  contacto_nombre: z.string().trim().max(120).nullable().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email({ message: 'Correo inválido' }).max(160).nullable().optional(),
  categoria_productos: z.string().trim().max(120).nullable().optional(),
});

/** Query de GET /api/v1/proveedores (alimenta el dropdown del formulario). */
export const listarProveedoresQuerySchema = z.object({
  search: z.string().trim().min(1).max(150).optional(),
});

export const proveedorIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Identificador de proveedor inválido' }),
});

export type CrearProveedorInput = z.infer<typeof crearProveedorSchema>;
export type ListarProveedoresQuery = z.infer<typeof listarProveedoresQuerySchema>;
