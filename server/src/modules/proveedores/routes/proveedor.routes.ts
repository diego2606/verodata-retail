import { Router } from 'express';
import { proveedorController } from '../controllers/proveedor.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU036 — Administrador y Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', proveedorController.listar);
router.post('/', proveedorController.crear);

export default router;
