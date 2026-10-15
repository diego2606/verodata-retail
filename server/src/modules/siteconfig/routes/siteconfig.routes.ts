import { Router } from 'express';
import { siteConfigController } from '../controllers/siteconfig.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU034 — textos y franjas globales de la tienda (Administrador y Super Administrador)
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', siteConfigController.listar);
router.patch('/:clave', siteConfigController.actualizar);

export default router;
