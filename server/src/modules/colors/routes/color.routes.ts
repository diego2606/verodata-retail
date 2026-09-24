import { Router } from 'express';
import { colorController } from '../controllers/color.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU032 — catálogo de colores (Backoffice)
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', colorController.listar);
router.post('/', colorController.crear);
router.patch('/:id', colorController.actualizar);

export default router;
