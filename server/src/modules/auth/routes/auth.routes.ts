import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/login - Público
router.post('/login', authController.login);

// POST /api/auth/registro - Solo SUPER_ADMIN
router.post('/registro', authenticate, authorize('SUPER_ADMIN'), authController.registro);

export default router;
