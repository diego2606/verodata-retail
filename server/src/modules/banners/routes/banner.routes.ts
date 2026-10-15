import { Router } from 'express';
import { bannerController } from '../controllers/banner.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU034 — contenido de portada (Administrador y Super Administrador)
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', bannerController.listar);
router.post('/', bannerController.crear);
router.patch('/orden', bannerController.reordenar);
router.patch('/:id', bannerController.actualizar);
router.delete('/:id', bannerController.eliminar);

export default router;
