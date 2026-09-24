import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/routes/auth.routes';
import userRoutes from './modules/users/routes/user.routes';
import roleRoutes from './modules/users/routes/role.routes';
import categoryRoutes from './modules/categories/routes/category.routes';
import productRoutes from './modules/products/routes/product.routes';
import statusRoutes from './modules/status/routes/status.routes';
import { testConnection } from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middlewares globales
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'VeroData Retail API online', data: { version: '1.0.0' } });
});

// Rutas (API versionada)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/status', statusRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Recurso no encontrado', details: null },
  });
});

// Error handler global — loguea el stack completo para facilitar el debugging
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Error no controlado:', err.message);
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null },
  });
});

app.listen(PORT, async () => {
  console.log(`[Server] VeroData Retail API corriendo en http://localhost:${PORT}`);
  console.log(`[Server] Entorno: ${process.env.NODE_ENV ?? 'development'}`);
  try {
    await testConnection();
  } catch (e) {
    const err = e as Error;
    console.error('[DB] FALLO DE CONEXION AL INICIAR:', err.message);
    console.error('[DB] Verifica DB_HOST, DB_USER, DB_PASSWORD y que el proyecto Supabase esté activo.');
  }
});

export default app;
