import { Request, Response } from 'express';
import {
  loginSchema,
  recuperarPasswordSchema,
  registroClienteSchema,
  restablecerPasswordSchema,
} from '../schemas/auth.schemas';
import { authService } from '../services/auth.service';
import { googleConfigurado, oauthService } from '../services/oauth.service';
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

  /** GET /api/v1/auth/google — inicia el flujo OAuth (redirige a Google). */
  async googleRedirect(_req: Request, res: Response): Promise<void> {
    try {
      if (!googleConfigurado()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message: 'El acceso con Google no está configurado en el servidor',
            details: null,
          },
        });
        return;
      }
      res.redirect(oauthService.urlDeAutorizacion());
    } catch (error) {
      console.error('[AuthController] googleRedirect error:', error);
      res.status(500).json(internalError());
    }
  },

  /** GET /api/v1/auth/google/callback — Google redirige aquí con el code. */
  async googleCallback(req: Request, res: Response): Promise<void> {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    try {
      if (!code || !state) {
        res.redirect(oauthService.urlDeError('MISSING_CODE'));
        return;
      }
      const { token, usuario } = await oauthService.callback(code, state);
      res.redirect(oauthService.urlDeExito(usuario, token));
    } catch (error) {
      console.error('[AuthController] googleCallback error:', error);
      const codigo = error instanceof Error ? error.message : 'OAUTH_ERROR';
      res.redirect(oauthService.urlDeError(codigo));
    }
  },
};
