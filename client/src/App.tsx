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
import { ClienteRoute } from './router/ClienteRoute';
import { LoginModalProvider } from './context/LoginModalContext';
import { RegistroPage } from './pages/public/cuenta/RegistroPage';
import { RecuperarPage } from './pages/public/cuenta/RecuperarPage';
import { RestablecerPage } from './pages/public/cuenta/RestablecerPage';
import { OauthCallbackPage } from './pages/public/cuenta/OauthCallbackPage';
import { PerfilPage } from './pages/public/cuenta/PerfilPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { ProductoEditorPage } from './pages/admin/producto-editor/ProductoEditorPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { ReposicionesPage } from './pages/admin/reposiciones/ReposicionesPage';
import { NuevaReposicionPage } from './pages/admin/reposiciones/NuevaReposicionPage';
import { DetalleReposicionPage } from './pages/admin/reposiciones/DetalleReposicionPage';
import { ColorsPage } from './pages/admin/ColorsPage';
import { AttributesPage } from './pages/admin/AttributesPage';
import { ContentPage } from './pages/admin/ContentPage';
import { ComingSoonPage } from './pages/admin/ComingSoonPage';

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoginModalProvider>
        <Routes>
          {/* Storefront público (HU013) */}
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<StorefrontHomePage />} />
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/producto/:id" element={<ProductDetailPage />} />

            {/* Cuenta de cliente (registro y recuperación) */}
            <Route path="/cuenta/registro" element={<RegistroPage />} />
            <Route path="/cuenta/recuperar" element={<RecuperarPage />} />
            <Route path="/cuenta/restablecer" element={<RestablecerPage />} />
            <Route path="/cuenta/oauth" element={<OauthCallbackPage />} />

            {/* Perfil — requiere sesión */}
            <Route element={<ClienteRoute />}>
              <Route path="/cuenta/perfil" element={<PerfilPage />} />
            </Route>
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
              <Route path="/admin/products/new" element={<ProductoEditorPage modo="crear" />} />
              <Route path="/admin/products/:id/edit" element={<ProductoEditorPage modo="editar" />} />
              <Route path="/admin/reposiciones" element={<ReposicionesPage />} />
              <Route path="/admin/reposiciones/nueva" element={<NuevaReposicionPage />} />
              <Route path="/admin/reposiciones/:id" element={<DetalleReposicionPage />} />
              <Route path="/admin/inventory" element={<InventoryPage />} />
              <Route path="/admin/colors" element={<ColorsPage />} />
              <Route path="/admin/attributes" element={<AttributesPage />} />
              <Route path="/admin/contenido" element={<ContentPage />} />

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
        </LoginModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
