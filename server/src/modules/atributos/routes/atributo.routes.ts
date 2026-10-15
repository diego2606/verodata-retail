import { Router } from 'express';
import { atributoController } from '../controllers/atributo.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// Maestro de atributos — Administrador y Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', atributoController.listar);
router.post('/', atributoController.crear);
router.patch('/valores/:valorId', atributoController.actualizarValor);
router.delete('/valores/:valorId', atributoController.eliminarValor);
router.patch('/:id', atributoController.actualizar);
router.delete('/:id', atributoController.eliminar);
router.post('/:id/valores', atributoController.crearValor);

export default router;
