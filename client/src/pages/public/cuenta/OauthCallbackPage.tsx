import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CuentaCard, Alerta, BOTON_STORE } from '../../../components/storefront/CuentaCard';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { useLoginModal } from '../../../context/LoginModalContext';
import type { UserRole } from '../../../types/cuenta.types';

/**
 * Página de retorno del OAuth con Google.
 * El backend redirige aquí con el token en el fragmento (#), que nunca viaja al servidor.
 */
export function OauthCallbackPage(): React.ReactElement {
  const { login, isAuthenticated } = useAuth();
  const { abrirLogin } = useLoginModal();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get('token');

    if (token) {
      login(
        token,
        {
          id: params.get('id') ?? '',
          email: params.get('email') ?? '',
          rol: (params.get('rol') as UserRole) ?? 'CLIENTE',
          nombre: params.get('nombre') || null,
        },
        true
      );
      return;
    }
    setError(params.get('error') ?? 'NO_TOKEN');
  }, [login]);

  useEffect(() => {
    if (isAuthenticated && !error) navigate('/cuenta/perfil', { replace: true });
  }, [isAuthenticated, error, navigate]);

  if (!error) {
    return (
      <CuentaCard titulo="Iniciando sesión…" subtitulo="Validando tu cuenta de Google.">
        <div className="h-24 animate-pulse rounded-md bg-store-line/40" />
      </CuentaCard>
    );
  }

  return (
    <CuentaCard titulo="No pudimos iniciar sesión" subtitulo="Ocurrió un problema con el acceso con Google.">
      <Alerta tipo="error">Código: {error}</Alerta>
      <div className="mt-lg">
        <Button
          type="button"
          className={BOTON_STORE}
          onClick={() => {
            abrirLogin();
            navigate('/', { replace: true });
          }}
        >
          Probar con correo
        </Button>
      </div>
    </CuentaCard>
  );
}

export default OauthCallbackPage;
