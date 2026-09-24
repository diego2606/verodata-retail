import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// Módulo exclusivo de Super Administrador (HU002 / HU003)
router.use(authenticate, authorize('SUPER_ADMIN'));

// GET /api/v1/users — listado y auditoría de colaboradores
router.get('/', userController.listar);

// GET /api/v1/users/search?documento=... — búsqueda unitaria por documento (HU004)
// Se declara antes de /:id para que "search" no sea interpretado como un UUID.
router.get('/search', userController.buscarPorDocumento);

// POST /api/v1/users — registro de personal interno
router.post('/', userController.crear);

// GET /api/v1/users/:id — consulta unitaria por ID (HU004)
router.get('/:id', userController.obtener);

// PATCH /api/v1/users/:id — actualización de datos (HU005)
router.patch('/:id', userController.actualizar);

// PATCH /api/v1/users/:id/bloqueo — bloquear / desbloquear cuenta
router.patch('/:id/bloqueo', userController.actualizarBloqueo);

export default router;
