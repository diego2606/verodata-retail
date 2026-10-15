import { Request, Response } from 'express';
import {
  actualizarModeloSchema,
  crearModeloSchema,
  deltaVariantesSchema,
  modeloIdParamSchema,
  skuIdParamSchema,
} from '../schemas/product-model.schemas';
import {
  actualizarImagenSchema,
  agregarImagenSchema,
  imagenParamSchema,
} from '../../products/schemas/product.schemas';
import { mapearErrorUnicidad, productModelService } from '../services/product-model.service';
import {
  AtributoFaltanteError,
  AtributoInvalidoError,
  SkuRequeridoError,
  VarianteAjenaError,
  VarianteDuplicadaError,
} from '../services/product-model.errors';
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

/** Traduce errores de dominio del delta a respuestas 400 controladas. */
function responderErrorDominio(error: unknown, res: Response): boolean {
  if (error instanceof VarianteDuplicadaError) {
    res.status(400).json(fallo('VARIANT_ALREADY_EXISTS', error.message, { combinacion: error.combinacion }));
    return true;
  }
  if (error instanceof AtributoInvalidoError) {
    res.status(400).json(fallo('INVALID_ATTRIBUTE', error.message, { atributos: error.atributos, permitidos: error.permitidos }));
    return true;
  }
  if (error instanceof AtributoFaltanteError) {
    res.status(400).json(fallo('MISSING_REQUIRED_ATTRIBUTE', error.message, { faltantes: error.faltantes }));
    return true;
  }
  if (error instanceof SkuRequeridoError) {
    res.status(400).json(fallo('SKU_REQUIRED', error.message));
    return true;
  }
  if (error instanceof VarianteAjenaError) {
    res.status(400).json(fallo('VARIANT_NOT_FOUND', error.message, { sku_id: error.skuId }));
    return true;
  }
  return false;
}

export const productModelController = {
  async listar(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json(await productModelService.listar());
    } catch (error) {
      console.error('[ProductModelController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearModeloSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.crear(parsed.data);
      if (!result.success) {
        res.status(result.error.code === 'CATEGORY_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      console.error('[ProductModelController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const params = modeloIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.obtener(params.data.id);
      if (!result.success) {
        res.status(result.error.code === 'MODEL_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductModelController] obtener error:', error);
      res.status(500).json(internalError());
    }
  },

  /** GET /api/v1/product-models/by-sku/:skuId — resuelve el modelo de un SKU. */
  async obtenerPorSku(req: Request, res: Response): Promise<void> {
    try {
      const params = skuIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.obtenerPorSku(params.data.skuId);
      if (!result.success) {
        res.status(result.error.code === 'MODEL_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductModelController] obtenerPorSku error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const params = modeloIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarModeloSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.actualizar(params.data.id, parsed.data);
      if (!result.success) {
        res.status(result.error.code === 'MODEL_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductModelController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },

  async aplicarDelta(req: Request, res: Response): Promise<void> {
    try {
      const params = modeloIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const body = deltaVariantesSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json(validationError(body.error.flatten().fieldErrors));
        return;
      }

      const result = await productModelService.aplicarDelta(params.data.id, body.data);
      if (!result.success) {
        res.status(result.error.code === 'MODEL_NOT_FOUND' ? 404 : result.error.code === 'SKU_ALREADY_EXISTS' ? 409 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      if (responderErrorDominio(error, res)) return;
      try {
        const failure = mapearErrorUnicidad(error);
        res.status(failure.error.code === 'SKU_ALREADY_EXISTS' ? 409 : 400).json(failure);
      } catch {
        console.error('[ProductModelController] aplicarDelta error:', error);
        res.status(500).json(internalError());
      }
    }
  },

  // ── HU033/HU035: galería de imágenes del Producto Padre ────────────────────

  async listarImagenes(req: Request, res: Response): Promise<void> {
    try {
      const params = modeloIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.listarImagenes(params.data.id);
      if (!result.success) {
        res.status(result.error.code === 'MODEL_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductModelController] listarImagenes error:', error);
      res.status(500).json(internalError());
    }
  },

  async agregarImagen(req: Request, res: Response): Promise<void> {
    try {
      const params = modeloIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = agregarImagenSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.agregarImagen(params.data.id, parsed.data);
      if (!result.success) {
        res.status(result.error.code === 'MODEL_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      console.error('[ProductModelController] agregarImagen error:', error);
      res.status(500).json(internalError());
    }
  },

  async marcarImagenPrincipal(req: Request, res: Response): Promise<void> {
    try {
      const params = imagenParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.marcarImagenPrincipal(params.data.id, params.data.imagenId);
      if (!result.success) {
        res.status(result.error.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductModelController] marcarImagenPrincipal error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizarImagen(req: Request, res: Response): Promise<void> {
    try {
      const params = imagenParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = actualizarImagenSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.actualizarImagen(
        params.data.id,
        params.data.imagenId,
        parsed.data
      );
      if (!result.success) {
        res.status(result.error.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductModelController] actualizarImagen error:', error);
      res.status(500).json(internalError());
    }
  },

  async eliminarImagen(req: Request, res: Response): Promise<void> {
    try {
      const params = imagenParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await productModelService.eliminarImagen(params.data.id, params.data.imagenId);
      if (!result.success) {
        res.status(result.error.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductModelController] eliminarImagen error:', error);
      res.status(500).json(internalError());
    }
  },
};
