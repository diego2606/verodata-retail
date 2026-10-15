import { Request, Response } from 'express';
import { proveedorService } from '../services/proveedor.service';
import {
  crearProveedorSchema,
  listarProveedoresQuerySchema,
} from '../schemas/proveedor.schemas';
import { ApiFailure } from '../../../shared/types/api.types';

function fallo(code: string, message: string): ApiFailure {
  return { success: false, error: { code, message, details: null } };
}

export const proveedorController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarProveedoresQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(fallo('VALIDATION_ERROR', 'Parámetros de búsqueda inválidos'));
        return;
      }
      res.status(200).json(await proveedorService.listar(parsed.data));
    } catch (error) {
      console.error('[ProveedorController] listar error:', error);
      res.status(500).json(fallo('INTERNAL_ERROR', 'Error interno del servidor'));
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearProveedorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de entrada inválidos',
            details: parsed.error.flatten().fieldErrors,
          },
        });
        return;
      }
      const result = await proveedorService.crear(parsed.data);
      if (!result.success) {
        res.status(result.error.code === 'PROVEEDOR_ALREADY_EXISTS' ? 409 : 400).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      console.error('[ProveedorController] crear error:', error);
      res.status(500).json(fallo('INTERNAL_ERROR', 'Error interno del servidor'));
    }
  },
};
