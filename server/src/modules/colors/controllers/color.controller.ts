import { Request, Response } from 'express';
import {
  actualizarColorSchema,
  colorIdParamSchema,
  crearColorSchema,
  listarColoresQuerySchema,
} from '../schemas/color.schemas';
import { colorService } from '../services/color.service';
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

export const colorController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarColoresQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await colorService.listar(parsed.data);
      res.status(200).json(result);
    } catch (error) {
      console.error('[ColorController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearColorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await colorService.crear(parsed.data);
      if (!result.success) {
        const status =
          result.error.code === 'NAME_ALREADY_EXISTS' || result.error.code === 'SLUG_ALREADY_EXISTS'
            ? 409
            : 400;
        res.status(status).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      console.error('[ColorController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const params = colorIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarColorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await colorService.actualizar(params.data.id, parsed.data);
      if (!result.success) {
        const status =
          result.error.code === 'RESOURCE_NOT_FOUND'
            ? 404
            : result.error.code === 'NAME_ALREADY_EXISTS' ||
                result.error.code === 'SLUG_ALREADY_EXISTS'
              ? 409
              : 400;
        res.status(status).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ColorController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },
};
