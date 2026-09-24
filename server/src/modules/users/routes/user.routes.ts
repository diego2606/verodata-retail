import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// Módulo exclusivo de Super Administrador (HU002 / HU003)
router.use(authenticate, authorize('SUPER_ADMIN'));

// GET /api/v1/users — listado y auditoría de colaboradores
router.get('/', userController.listar);

// POST /api/v1/users — registro de personal interno
router.post('/', userController.crear);

// PATCH /api/v1/users/:id/bloqueo — bloquear / desbloquear cuenta
router.patch('/:id/bloqueo', userController.actualizarBloqueo);

export default router;
