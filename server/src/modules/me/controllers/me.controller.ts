import { Request, Response } from 'express';
import { actualizarPerfilSchema, cambiarPasswordSchema } from '../schemas/me.schemas';
import { meService } from '../services/me.service';
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

export const meController = {
  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id_usuario;
      if (!usuarioId) {
        res.status(401).json(noAutenticado());
        return;
      }
      const result = await meService.obtener(usuarioId);
      res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      console.error('[MeController] obtener error:', error);
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
      const parsed = actualizarPerfilSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await meService.actualizar(usuarioId, parsed.data);
      if (!result.success) {
        res.status(result.error.code === 'DOCUMENT_ALREADY_EXISTS' ? 409 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[MeController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },

  async cambiarPassword(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id_usuario;
      if (!usuarioId) {
        res.status(401).json(noAutenticado());
        return;
      }
      const parsed = cambiarPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await meService.cambiarPassword(usuarioId, parsed.data);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('[MeController] cambiarPassword error:', error);
      res.status(500).json(internalError());
    }
  },
};
