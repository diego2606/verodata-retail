import { Request, Response } from 'express';
import {
  actualizarImagenSchema,
  actualizarProductoSchema,
  agregarImagenSchema,
  crearProductosLoteSchema,
  crearProductoSchema,
  imagenParamSchema,
  listarProductosQuerySchema,
  productoIdParamSchema,
} from '../schemas/product.schemas';
import { productService } from '../services/product.service';
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

export const productController = {
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const parsed = listarProductosQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await productService.listar(parsed.data);
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductController] listar error:', error);
      res.status(500).json(internalError());
    }
  },

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearProductoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await productService.crear(parsed.data);

      if (!result.success) {
        const status =
          result.error.code === 'SKU_ALREADY_EXISTS' || result.error.code === 'VARIANT_ALREADY_EXISTS'
            ? 409
            : result.error.code === 'CATEGORY_NOT_FOUND'
              ? 404
              : 400;
        res.status(status).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('[ProductController] crear error:', error);
      res.status(500).json(internalError());
    }
  },

  /** POST /api/v1/products/bulk (HU028) — alta transaccional de variantes. */
  async crearLote(req: Request, res: Response): Promise<void> {
    try {
      const parsed = crearProductosLoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await productService.crearLote(parsed.data);

      if (!result.success) {
        const status =
          result.error.code === 'SKU_ALREADY_EXISTS' || result.error.code === 'VARIANT_ALREADY_EXISTS'
            ? 409
            : result.error.code === 'CATEGORY_NOT_FOUND'
              ? 404
              : 400;
        res.status(status).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('[ProductController] crearLote error:', error);
      res.status(500).json(internalError());
    }
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const params = productoIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }

      const parsed = actualizarProductoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }

      const result = await productService.actualizar(params.data.id, parsed.data);

      if (!result.success) {
        const status =
          result.error.code === 'RESOURCE_NOT_FOUND' || result.error.code === 'CATEGORY_NOT_FOUND'
            ? 404
            : result.error.code === 'VARIANT_ALREADY_EXISTS' ||
                result.error.code === 'SKU_ALREADY_EXISTS' ||
                result.error.code === 'SKU_INMUTABLE'
              ? 409
              : 400;
        res.status(status).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductController] actualizar error:', error);
      res.status(500).json(internalError());
    }
  },

  // ── HU033: galería de imágenes ──────────────────────────────────────────────

  async listarImagenes(req: Request, res: Response): Promise<void> {
    try {
      const params = productoIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const result = await productService.listarImagenes(params.data.id);
      if (!result.success) {
        res.status(result.error.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductController] listarImagenes error:', error);
      res.status(500).json(internalError());
    }
  },

  async agregarImagen(req: Request, res: Response): Promise<void> {
    try {
      const params = productoIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json(validationError(params.error.flatten().fieldErrors));
        return;
      }
      const parsed = agregarImagenSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(validationError(parsed.error.flatten().fieldErrors));
        return;
      }
      const result = await productService.agregarImagen(params.data.id, parsed.data);
      if (!result.success) {
        res.status(result.error.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      console.error('[ProductController] agregarImagen error:', error);
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
      const result = await productService.marcarImagenPrincipal(params.data.id, params.data.imagenId);
      if (!result.success) {
        res.status(result.error.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductController] marcarImagenPrincipal error:', error);
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
      const result = await productService.actualizarImagen(
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
      console.error('[ProductController] actualizarImagen error:', error);
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
      const result = await productService.eliminarImagen(params.data.id, params.data.imagenId);
      if (!result.success) {
        res.status(result.error.code === 'RESOURCE_NOT_FOUND' ? 404 : 400).json(result);
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      console.error('[ProductController] eliminarImagen error:', error);
      res.status(500).json(internalError());
    }
  },
};
