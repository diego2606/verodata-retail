import { Request, Response } from 'express';
import {
  actualizarCategoriaSchema,
  categoriaIdParamSchema,
  crearCategoriaSchema,
  listarCategoriasQuerySchema,
  reordenarCategoriasSchema,
} from '../schemas/category.schemas';
import { categoryService } from '../services/category.service';
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

export const categoryController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarCategoriasQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await categoryService.listar(parsed.data);
      res.status(200).json(result);
    } catch (error) {
      console.error('[CategoryController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearCategoriaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await categoryService.crear(parsed.data);

      if (!result.success) {
        const conflictCodes = ['NAME_ALREADY_EXISTS', 'SLUG_ALREADY_EXISTS'];
        const status =
          result.error.code === 'PARENT_NOT_FOUND'
            ? 404
            : conflictCodes.includes(result.error.code)
              ? 409
              : 400;
        res.status(status).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('[CategoryController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const params = categoriaIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }

      const parsed = actualizarCategoriaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await categoryService.actualizar(params.data.id, parsed.data);

      if (!result.success) {
        const conflictCodes = ['NAME_ALREADY_EXISTS', 'SLUG_ALREADY_EXISTS'];
        const status = conflictCodes.includes(result.error.code)
          ? 409
          : result.error.code === 'RESOURCE_NOT_FOUND' || result.error.code === 'PARENT_NOT_FOUND'
            ? 404
            : 400;
        res.status(status).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('[CategoryController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const params = categoriaIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }

      const result = await categoryService.eliminar(params.data.id);

      if (!result.success) {
        const status =
          result.error.code === 'RESOURCE_NOT_FOUND'
            ? 404
            : result.error.code === 'CATEGORY_HAS_PRODUCTS' ||
                result.error.code === 'CATEGORY_HAS_SUBCATEGORIES'
              ? 409
              : 400;
        res.status(status).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('[CategoryController] eliminar error:', error);
      res.status(500).json(internalError());
    }
  },

  async reordenar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = reordenarCategoriasSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      res.status(200).json(await categoryService.reordenar(parsed.data.ids));
    } catch (error) {
      console.error('[CategoryController] reordenar error:', error);
      res.status(500).json(internalError());
    }
  },
};
