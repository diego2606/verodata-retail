import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './router/ProtectedRoute';
import { RoleRoute } from './router/RoleRoute';
import { BackofficeLayout } from './layouts/BackofficeLayout';
import { StorefrontLayout } from './layouts/StorefrontLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { ManualPage } from './pages/public/ManualPage';
import { StorefrontHomePage } from './pages/public/StorefrontHomePage';
import { CatalogPage } from './pages/public/CatalogPage';
import { ProductDetailPage } from './pages/public/ProductDetailPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { ColorsPage } from './pages/admin/ColorsPage';
import { ComingSoonPage } from './pages/admin/ComingSoonPage';

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Storefront público (HU013) */}
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<StorefrontHomePage />} />
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/producto/:id" element={<ProductDetailPage />} />
          </Route>

          {/* Rutas públicas de acceso */}
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

              {/* Catálogo e Inventario (HU007–HU012) */}
              <Route path="/admin/products" element={<ProductsPage />} />
              <Route path="/admin/inventory" element={<InventoryPage />} />
              <Route path="/admin/colors" element={<ColorsPage />} />

              {/* Módulos de sprints futuros (placeholders navegables) */}
              <Route
                path="/admin/orders"
                element={
                  <ComingSoonPage
                    title="Pedidos"
                    description="La gestión de pedidos y estados estará disponible próximamente."
                  />
                }
              />

              {/* Cualquier ruta /admin/* desconocida vuelve al dashboard */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* 404 — cualquier ruta no definida vuelve al Storefront */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
