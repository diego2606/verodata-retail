import { Router } from 'express';
import { statusController } from '../controllers/status.controller';

const router = Router();

// GET /api/v1/status — público (usado por la pantalla de login)
router.get('/', statusController.obtener);

export default router;
