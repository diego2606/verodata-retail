import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU007 — Administrador y Super Administrador
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', productController.listar);
router.post('/', productController.crear);
router.post('/bulk', productController.crearLote);
router.patch('/:id', productController.actualizar);

// HU033 — galería de imágenes
router.get('/:id/images', productController.listarImagenes);
router.post('/:id/images', productController.agregarImagen);
router.patch('/:id/images/:imagenId/principal', productController.marcarImagenPrincipal);
router.patch('/:id/images/:imagenId', productController.actualizarImagen);
router.delete('/:id/images/:imagenId', productController.eliminarImagen);

export default router;
