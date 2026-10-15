import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Skeleton de pantalla completa mientras se rehidrata la sesión desde localStorage
function SessionSkeleton(): React.ReactElement {
  return (
    <div className="min-h-screen bg-canvas-soft flex items-center justify-center">
      <div className="flex flex-col items-center gap-md">
        <div className="w-8 h-8 rounded-sm bg-hairline-cool animate-pulse" />
        <div className="w-32 h-2 rounded-full bg-hairline-cool animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Protege las rutas bajo /admin/*.
 * - Muestra skeleton mientras isLoading (rehidratación de localStorage).
 * - Redirige a /login si no hay sesión activa.
 * - Renderiza <Outlet /> si el usuario está autenticado.
 */
export function ProtectedRoute(): React.ReactElement {
  const { isAuthenticated, isLoading, usuario } = useAuth();

  if (isLoading) return <SessionSkeleton />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // Un cliente no accede al backoffice: va a su perfil en la tienda.
  if (usuario?.rol === 'CLIENTE') return <Navigate to="/cuenta/perfil" replace />;

  return <Outlet />;
}

