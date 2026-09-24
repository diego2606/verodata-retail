import { Request, Response } from 'express';
import {
  ajustarInventarioSchema,
  inventarioProductoParamSchema,
} from '../schemas/inventory.schemas';
import { inventoryService } from '../services/inventory.service';
import { ApiFailure } from '../../../shared/types/api.types';

function validationError(details: unknown): ApiFailure {
  return {
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos', details },
  };
}

function internalError(): ApiFailure {
  return {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null },
  };
}

export const inventoryController = {
  /** GET /api/v1/inventory/alerts (HU012 CA03). */
  async listarAlertas(_req: Request, res: Response): Promise<void> {
    try {
      const result = await inventoryService.listarAlertas();
      res.status(200).json(result);
    } catch (error) {
      console.error('[InventoryController] listarAlertas error:', error);
      res.status(500).json(internalError());
    }
  },

  /** PATCH /api/v1/inventory/:productoId (HU010). */
  async ajustar(req: Request, res: Response): Promise<void> {
    try {
      const params = inventarioProductoParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }

      const parsed = ajustarInventarioSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await inventoryService.ajustar(params.data.productoId, parsed.data);

      if (!result.success) {
        const status =
          result.error.code === 'RESOURCE_NOT_FOUND'
            ? 404
            : result.error.code === 'INSUFFICIENT_STOCK'
              ? 409
              : 400;
        res.status(status).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('[InventoryController] ajustar error:', error);
      res.status(500).json(internalError());
    }
  },
};
