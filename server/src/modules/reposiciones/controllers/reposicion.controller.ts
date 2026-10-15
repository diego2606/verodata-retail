import { Request, Response } from 'express';
import { reposicionService } from '../services/reposicion.service';
import {
  cancelarReposicionSchema,
  crearReposicionSchema,
  listarReposicionesQuerySchema,
  reposicionIdParamSchema,
} from '../schemas/reposicion.schemas';
import { ApiFailure } from '../../../shared/types/api.types';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

function validationError(details: unknown): ApiFailure {
  return fallo('VALIDATION_ERROR', 'Datos de entrada inválidos', details);
}

function internalError(): ApiFailure {
  return fallo('INTERNAL_ERROR', 'Error interno del servidor');
}

/** HTTP de los fallos de negocio del servicio (404 / 409 / 400). */
function statusDeNegocio(code: string): number {
  if (code === 'ORDEN_NOT_FOUND' || code === 'PROVEEDOR_NOT_FOUND' || code === 'PRODUCTO_NOT_FOUND') {
    return 404;
  }
  if (code === 'ORDEN_NO_PENDIENTE' || code === 'PRODUCTO_SIN_INVENTARIO') return 409;
  return 400;
}

export const reposicionController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarReposicionesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      res.status(200).json(await reposicionService.listar(parsed.data));
    } catch (error) {
      console.error('[ReposicionController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const params = reposicionIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await reposicionService.obtener(params.data.id);
      if (!result.success) {
        res.status(statusDeNegocio(result.error.code)).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ReposicionController] obtener error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearReposicionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await reposicionService.crear(parsed.data, req.user?.id_usuario ?? null);
      if (!result.success) {
        res.status(statusDeNegocio(result.error.code)).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      console.error('[ReposicionController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async recibir(req: Request, res: Response): Promise<void> {
    try {
      const params = reposicionIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await reposicionService.recibir(params.data.id, req.user?.id_usuario ?? null);
      if (!result.success) {
        res.status(statusDeNegocio(result.error.code)).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ReposicionController] recibir error:', error);
      res.status(500).json(internalError());
    }
  },

  async cancelar(req: Request, res: Response): Promise<void> {
    try {
      const params = reposicionIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = cancelarReposicionSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await reposicionService.cancelar(params.data.id, parsed.data);
      if (!result.success) {
        res.status(statusDeNegocio(result.error.code)).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ReposicionController] cancelar error:', error);
      res.status(500).json(internalError());
    }
  },
};
