import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';

/**
 * Guard de autorización por rol (RBAC).
 * Se anida dentro de <ProtectedRoute />, por lo que la sesión ya está validada.
 * Si el rol del usuario no está autorizado, renderiza un estado 403 sin
 * exponer la vista protegida.
 */
export function RoleRoute({ allowed }: { allowed: UserRole[] }): React.ReactElement {
  const { usuario } = useAuth();

  if (!usuario || !allowed.includes(usuario.rol)) {
    return (
      <div className="flex flex-col items-center justify-center gap-md py-huge text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-sm border border-hairline bg-canvas-soft"
          aria-hidden="true"
        >
          <ShieldAlert size={18} className="text-ink-faint" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Acceso restringido</p>
          <p className="mt-xs max-w-xs text-xs text-ink-mute">
            Tu rol no cuenta con permisos para ver esta sección. Contacta a un Super Administrador.
          </p>
        </div>
        <a
          href="/admin/dashboard"
          className="rounded-xs bg-primary px-sm py-xs text-xs font-medium text-on-primary transition-colors duration-150 hover:bg-primary-deep"
        >
          Volver al dashboard
        </a>
      </div>
    );
  }

  return <Outlet />;
}

export default RoleRoute;
