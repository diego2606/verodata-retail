import { Request, Response } from 'express';
import {
  listarCatalogoQuerySchema,
  productoIdParamSchema,
} from '../schemas/storefront.schemas';
import { storefrontService } from '../services/storefront.service';
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

export const storefrontController = {
  async listarProductos(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarCatalogoQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await storefrontService.listar(parsed.data);
      res.status(200).json(result);
    } catch (error) {
      console.error('[StorefrontController] listarProductos error:', error);
      res.status(500).json(internalError());
    }
  },

  async listarCategorias(_req: Request, res: Response): Promise<void> {
    try {
      const result = await storefrontService.categorias();
      res.status(200).json(result);
    } catch (error) {
      console.error('[StorefrontController] listarCategorias error:', error);
      res.status(500).json(internalError());
    }
  },

  async detalleProducto(req: Request, res: Response): Promise<void> {
    try {
      const params = productoIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await storefrontService.detalle(params.data.id);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('[StorefrontController] detalleProducto error:', error);
      res.status(500).json(internalError());
    }
  },
};
