import { Request, Response } from 'express';
import {
  actualizarBannerSchema,
  bannerIdParamSchema,
  crearBannerSchema,
  listarBannersQuerySchema,
  reordenarBannersSchema,
} from '../schemas/banner.schemas';
import { bannerService } from '../services/banner.service';
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

function statusDeError(code: string): number {
  if (code === 'RESOURCE_NOT_FOUND') return 404;
  if (code === 'INVALID_VIGENCIA') return 400;
  return 400;
}

export const bannerController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarBannersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      res.status(200).json(await bannerService.listar(parsed.data));
    } catch (error) {
      console.error('[BannerController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearBannerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await bannerService.crear(parsed.data);
      res.status(result.success ? 201 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[BannerController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const params = bannerIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarBannerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await bannerService.actualizar(params.data.id, parsed.data);
      res.status(result.success ? 200 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[BannerController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const params = bannerIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await bannerService.eliminar(params.data.id);
      res.status(result.success ? 200 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[BannerController] eliminar error:', error);
      res.status(500).json(internalError());
    }
  },

  async reordenar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = reordenarBannersSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      res.status(200).json(await bannerService.reordenar(parsed.data.ids));
    } catch (error) {
      console.error('[BannerController] reordenar error:', error);
      res.status(500).json(internalError());
    }
  },
};
