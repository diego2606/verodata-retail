import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU010/HU012 — Administrador y Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/alerts', inventoryController.listarAlertas);
router.patch('/:productoId', inventoryController.ajustar);

export default router;
