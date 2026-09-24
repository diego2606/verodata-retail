import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU007 — Administrador y Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', productController.listar);
router.post('/', productController.crear);

export default router;
