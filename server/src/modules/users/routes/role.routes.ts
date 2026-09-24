import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// Catálogo de roles para el alta de colaboradores — solo Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN'));
router.get('/', userController.listarRoles);

export default router;
