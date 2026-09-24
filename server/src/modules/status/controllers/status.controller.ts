import { Request, Response } from 'express';
import { statusService } from '../services/status.service';
import { ApiFailure } from '../../../shared/types/api.types';

export const statusController = {
  async obtener(_req: Request, res: Response): Promise<void> {
    try {
      const result = await statusService.obtener();
      res.status(200).json(result);
    } catch (error) {
      console.error('[StatusController] error:', error);
      const body: ApiFailure = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null },
      };
      res.status(500).json(body);
    }
  },
};
