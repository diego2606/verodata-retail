import { Request, Response } from 'express';
import {
  loginSchema,
  recuperarPasswordSchema,
  registroClienteSchema,
  restablecerPasswordSchema,
} from '../schemas/auth.schemas';
import { authService } from '../services/auth.service';
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

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await authService.login(parsed.data);

      if (!result.success) {
        const status = result.error.code === 'INVALID_CREDENTIALS' ? 401 : 403;
        res.status(status).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('[AuthController] login error:', error);
      res.status(500).json(internalError());
    }
  },

  async registrar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registroClienteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await authService.registrar(parsed.data);
      if (!result.success) {
        const status =
          result.error.code === 'EMAIL_ALREADY_EXISTS' ||
          result.error.code === 'DOCUMENT_ALREADY_EXISTS'
            ? 409
            : 400;
        res.status(status).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('[AuthController] registrar error:', error);
      res.status(500).json(internalError());
    }
  },

  async recuperar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = recuperarPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      res.status(200).json(await authService.recuperar(parsed.data.email));
    } catch (error) {
      console.error('[AuthController] recuperar error:', error);
      res.status(500).json(internalError());
    }
  },

  async restablecer(req: Request, res: Response): Promise<void> {
    try {
      const parsed = restablecerPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await authService.restablecer(parsed.data);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('[AuthController] restablecer error:', error);
      res.status(500).json(internalError());
    }
  },
};
