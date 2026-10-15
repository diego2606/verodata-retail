import { Request, Response } from 'express';
import {
  actualizarAtributoSchema,
  actualizarValorSchema,
  atributoIdParamSchema,
  crearAtributoSchema,
  crearValorSchema,
  valorIdParamSchema,
} from '../schemas/atributo.schemas';
import { atributoService } from '../services/atributo.service';
import { ApiFailure } from '../../../shared/types/api.types';

function validationError(details: unknown): ApiFailure {
  return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos', details } };
}

function internalError(): ApiFailure {
  return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null } };
}

function statusDeError(code: string): number {
  if (code === 'RESOURCE_NOT_FOUND') return 404;
  if (
    code === 'CODE_ALREADY_EXISTS' ||
    code === 'VALUE_ALREADY_EXISTS' ||
    code === 'VALUE_IN_USE' ||
    code === 'ATTRIBUTE_IN_USE' ||
    code === 'VARIANT_CONFLICT'
  ) {
    return 409;
  }
  return 400;
}

export const atributoController = {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await atributoService.listar());
    } catch (error) {
      console.error('[AtributoController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearAtributoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await atributoService.crear(parsed.data);
      res.status(result.success ? 201 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[AtributoController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const params = atributoIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarAtributoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await atributoService.actualizar(params.data.id, parsed.data);
      res.status(result.success ? 200 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[AtributoController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const params = atributoIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await atributoService.eliminar(params.data.id);
      res.status(result.success ? 200 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[AtributoController] eliminar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crearValor(req: Request, res: Response): Promise<void> {
    try {
      const params = atributoIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = crearValorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await atributoService.crearValor(params.data.id, parsed.data);
      res.status(result.success ? 201 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[AtributoController] crearValor error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizarValor(req: Request, res: Response): Promise<void> {
    try {
      const params = valorIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarValorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await atributoService.actualizarValor(params.data.valorId, parsed.data);
      res.status(result.success ? 200 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[AtributoController] actualizarValor error:', error);
      res.status(500).json(internalError());
    }
  },

  async eliminarValor(req: Request, res: Response): Promise<void> {
    try {
      const params = valorIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await atributoService.eliminarValor(params.data.valorId);
      res.status(result.success ? 200 : statusDeError(result.error.code)).json(result);
    } catch (error) {
      console.error('[AtributoController] eliminarValor error:', error);
      res.status(500).json(internalError());
    }
  },
};
