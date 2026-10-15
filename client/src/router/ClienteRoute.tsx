import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoginModal } from '../context/LoginModalContext';

/** Guarda las rutas de cuenta del cliente (/cuenta/*). Si no hay sesión, abre el modal de acceso. */
export function ClienteRoute(): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  const { abrirLogin } = useLoginModal();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) abrirLogin();
  }, [isLoading, isAuthenticated, abrirLogin]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[460px] py-huge">
        <div className="h-64 animate-pulse rounded-lg border border-store-line bg-store-surface" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}
