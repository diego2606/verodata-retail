import { Request, Response } from 'express';
import {
  crearProductoSchema,
  listarProductosQuerySchema,
} from '../schemas/product.schemas';
import { productService } from '../services/product.service';
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

export const productController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarProductosQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await productService.listar(parsed.data);
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearProductoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await productService.crear(parsed.data);

      if (!result.success) {
        const status =
          result.error.code === 'SKU_ALREADY_EXISTS'
            ? 409
            : result.error.code === 'CATEGORY_NOT_FOUND'
              ? 404
              : 400;
        res.status(status).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('[ProductController] crear error:', error);
      res.status(500).json(internalError());
    }
  },
};
