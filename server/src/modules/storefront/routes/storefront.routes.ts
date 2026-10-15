import { Router } from 'express';
import { storefrontController } from '../controllers/storefront.controller';

const router = Router();

// HU013 / HU016 / HU034 — Catálogo y portada pública (SIN autenticación)
router.get('/home', storefrontController.home);
router.get('/categories', storefrontController.listarCategorias);
router.get('/products', storefrontController.listarProductos);
router.get('/products/:id', storefrontController.detalleProducto);

export default router;
