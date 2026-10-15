import { Request, Response } from 'express';
import {
  actualizarDireccionSchema,
  crearDireccionSchema,
  direccionIdParamSchema,
} from '../schemas/direccion.schemas';
import { direccionService } from '../services/direccion.service';
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

function noAutenticado(): ApiFailure {
  return { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado', details: null } };
}

export const direccionController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id_usuario;
      if (!usuarioId) {
        res.status(401).json(noAutenticado());
        return;
      }
      res.status(200).json(await direccionService.listar(usuarioId));
    } catch (error) {
      console.error('[DireccionController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id_usuario;
      if (!usuarioId) {
        res.status(401).json(noAutenticado());
        return;
      }
      const parsed = crearDireccionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      res.status(201).json(await direccionService.crear(usuarioId, parsed.data));
    } catch (error) {
      console.error('[DireccionController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id_usuario;
      if (!usuarioId) {
        res.status(401).json(noAutenticado());
        return;
      }
      const params = direccionIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarDireccionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await direccionService.actualizar(usuarioId, params.data.id, parsed.data);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('[DireccionController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },

  async marcarPrincipal(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id_usuario;
      if (!usuarioId) {
        res.status(401).json(noAutenticado());
        return;
      }
      const params = direccionIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await direccionService.marcarPrincipal(usuarioId, params.data.id);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('[DireccionController] marcarPrincipal error:', error);
      res.status(500).json(internalError());
    }
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id_usuario;
      if (!usuarioId) {
        res.status(401).json(noAutenticado());
        return;
      }
      const params = direccionIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await direccionService.eliminar(usuarioId, params.data.id);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('[DireccionController] eliminar error:', error);
      res.status(500).json(internalError());
    }
  },
};
