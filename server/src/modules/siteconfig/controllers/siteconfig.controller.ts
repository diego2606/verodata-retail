import { Request, Response } from 'express';
import { actualizarConfigSchema, configClaveParamSchema } from '../schemas/siteconfig.schemas';
import { siteConfigService } from '../services/siteconfig.service';
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

export const siteConfigController = {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await siteConfigService.listar());
    } catch (error) {
      console.error('[SiteConfigController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const params = configClaveParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      res.status(200).json(await siteConfigService.actualizar(params.data.clave, parsed.data.valor));
    } catch (error) {
      console.error('[SiteConfigController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },
};
