import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApiData } from '../../lib/useApiData';
import { CONTENEDOR_TIENDA } from '../../lib/utils';
import type { PerfilCliente } from '../../types/cuenta.types';

/**
 * Aviso para clientes con el perfil incompleto (sin documento).
 * El documento se exigirá en el checkout (HU014).
 */
export function PerfilIncompletoBanner(): React.ReactElement | null {
  const { isAuthenticated } = useAuth();
  const perfil = useApiData<PerfilCliente>(isAuthenticated ? '/api/v1/me' : null);

  if (!isAuthenticated) return null;
  if (perfil.estado.status !== 'success' || perfil.estado.data.perfil_completo) return null;

  return (
    <div className="border-b border-retail-gold/40 bg-retail-gold/10">
      <div className={`${CONTENEDOR_TIENDA} flex flex-wrap items-center justify-between gap-sm py-sm text-sm text-store-ink`}>
        <span className="flex items-center gap-sm">
          <AlertTriangle size={16} className="text-retail-gold" aria-hidden="true" />
          Completa tu documento de identidad para poder comprar.
        </span>
        <Link to="/cuenta/perfil" className="font-semibold text-store-accent hover:underline">
          Completar perfil
        </Link>
      </div>
    </div>
  );
}

export default PerfilIncompletoBanner;
