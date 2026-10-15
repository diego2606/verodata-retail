import { Router } from 'express';
import { productModelController } from '../controllers/product-model.controller';
import { authenticate, authorize } from '../../../middlewares/auth.middleware';

const router = Router();

// HU035 — Producto Padre (Modelo) y SKU hijo. Administrador y Super Administrador.
router.use(authenticate, authorize('SUPER_ADMIN', 'ADMIN'));

router.get('/', productModelController.listar);
router.post('/', productModelController.crear);
router.get('/by-sku/:skuId', productModelController.obtenerPorSku);
router.get('/:id', productModelController.obtener);
router.patch('/:id', productModelController.actualizar);
router.post('/:id/variantes/delta', productModelController.aplicarDelta);

// HU033/HU035 — galería de imágenes del Producto Padre
router.get('/:id/images', productModelController.listarImagenes);
router.post('/:id/images', productModelController.agregarImagen);
router.patch('/:id/images/:imagenId/principal', productModelController.marcarImagenPrincipal);
router.patch('/:id/images/:imagenId', productModelController.actualizarImagen);
router.delete('/:id/images/:imagenId', productModelController.eliminarImagen);

export default router;
