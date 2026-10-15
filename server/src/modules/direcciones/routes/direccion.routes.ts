import { Router } from 'express';
import { direccionController } from '../controllers/direccion.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

// HU017 — libreta de direcciones del usuario autenticado
router.use(authenticate);

router.get('/', direccionController.listar);
router.post('/', direccionController.crear);
router.patch('/:id', direccionController.actualizar);
router.patch('/:id/principal', direccionController.marcarPrincipal);
router.delete('/:id', direccionController.eliminar);

export default router;
