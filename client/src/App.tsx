import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './router/ProtectedRoute';
import { RoleRoute } from './router/RoleRoute';
import { BackofficeLayout } from './layouts/BackofficeLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { ManualPage } from './pages/public/ManualPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { ComingSoonPage } from './pages/admin/ComingSoonPage';

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta raíz → redirige a /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/documentacion" element={<ManualPage />} />

          {/* Rutas protegidas — requieren sesión activa */}
          <Route element={<ProtectedRoute />}>
            <Route element={<BackofficeLayout />}>
              <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<DashboardPage />} />
              <Route path="/admin/categories" element={<CategoriesPage />} />

              {/* Rutas exclusivas de SUPER_ADMIN (RBAC) */}
              <Route element={<RoleRoute allowed={['SUPER_ADMIN']} />}>
                <Route path="/admin/users" element={<UsersPage />} />
              </Route>

              {/* Módulos de sprints futuros (placeholders navegables) */}
              <Route
                path="/admin/products"
                element={
                  <ComingSoonPage
                    title="Catálogo"
                    description="Categorías y productos (HU006–HU009) estarán disponibles próximamente."
                  />
                }
              />
              <Route
                path="/admin/inventory"
                element={
                  <ComingSoonPage
                    title="Inventario"
                    description="Control de stock y alertas (HU010–HU012) estarán disponibles próximamente."
                  />
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ComingSoonPage
                    title="Pedidos"
                    description="Gestión de pedidos y estados (HU018–HU022) estarán disponibles próximamente."
                  />
                }
              />

              {/* Cualquier ruta /admin/* desconocida vuelve al dashboard */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* 404 — cualquier ruta no definida */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
