import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

// POST /api/v1/auth/login — público
router.post('/login', authController.login);

// NOTA: el alta de personal interno vive en POST /api/v1/users (módulo users).

export default router;
