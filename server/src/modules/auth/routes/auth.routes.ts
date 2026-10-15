import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Rutas públicas de autenticación
router.post('/login', authController.login);
router.post('/registro', authController.registrar);
router.post('/recuperar', authController.recuperar);
router.post('/restablecer', authController.restablecer);

// Acceso social (OAuth 2.0 — Google)
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);

// NOTA: el alta de personal interno vive en POST /api/v1/users (módulo users).

export default router;
