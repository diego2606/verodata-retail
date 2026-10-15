import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Guarda de las rutas de cuenta del cliente (/cuenta/*). */
export function ClienteRoute(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[460px] py-huge">
        <div className="h-64 animate-pulse rounded-lg border border-store-line bg-store-surface" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/cuenta/ingresar" replace />;

  return <Outlet />;
}
