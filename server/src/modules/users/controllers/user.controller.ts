import { Request, Response } from 'express';
import {
  actualizarBloqueoSchema,
  crearUsuarioSchema,
  listarUsuariosQuerySchema,
  usuarioIdParamSchema,
} from '../schemas/user.schemas';
import { userService } from '../services/user.service';
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

export const userController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarUsuariosQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await userService.listar(parsed.data);
      res.status(200).json(result);
    } catch (error) {
      console.error('[UserController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async listarRoles(_req: Request, res: Response): Promise<void> {
    try {
      const result = await userService.listarRoles();
      res.status(200).json(result);
    } catch (error) {
      console.error('[UserController] listarRoles error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearUsuarioSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await userService.crear(parsed.data);

      if (!result.success) {
        const conflictCodes = ['EMAIL_ALREADY_EXISTS', 'DOCUMENT_ALREADY_EXISTS'];
        const status = conflictCodes.includes(result.error.code) ? 409 : 400;
        res.status(status).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('[UserController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizarBloqueo(req: Request, res: Response): Promise<void> {
    try {
      const params = usuarioIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }

      const parsed = actualizarBloqueoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await userService.actualizarBloqueo(params.data.id, parsed.data);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('[UserController] actualizarBloqueo error:', error);
      res.status(500).json(internalError());
    }
  },
};
