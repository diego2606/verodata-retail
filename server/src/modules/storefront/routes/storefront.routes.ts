import { Router } from 'express';
import { storefrontController } from '../controllers/storefront.controller';

const router = Router();

// HU013 / HU016 — Catálogo público del Storefront (SIN autenticación)
router.get('/categories', storefrontController.listarCategorias);
router.get('/products', storefrontController.listarProductos);
router.get('/products/:id', storefrontController.detalleProducto);

export default router;
