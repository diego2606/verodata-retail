import { Request, Response } from 'express';
import { loginSchema } from '../schemas/auth.schemas';
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
};
