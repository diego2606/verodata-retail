import { Router } from 'express';
import { reposicionController } from '../controllers/reposicion.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU036 — Administrador y Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', reposicionController.listar);
router.post('/', reposicionController.crear);
router.get('/:id', reposicionController.obtener);
router.patch('/:id/recibir', reposicionController.recibir);
router.patch('/:id/cancelar', reposicionController.cancelar);

export default router;
