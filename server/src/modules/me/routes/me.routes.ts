import { Router } from 'express';
import { meController } from '../controllers/me.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

// Perfil del usuario autenticado (cualquier rol con sesión activa)
router.use(authenticate);

router.get('/', meController.obtener);
router.patch('/', meController.actualizar);
router.patch('/password', meController.cambiarPassword);

export default router;
