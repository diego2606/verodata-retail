import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU006 — Administrador y Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', categoryController.listar);
router.post('/', categoryController.crear);
router.patch('/orden', categoryController.reordenar);
router.get('/:id/atributos', categoryController.atributos);
router.patch('/:id', categoryController.actualizar);
router.delete('/:id', categoryController.eliminar);

export default router;
