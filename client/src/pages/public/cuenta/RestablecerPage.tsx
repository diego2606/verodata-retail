import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  CuentaCard,
  Alerta,
  BOTON_STORE,
  INPUT_STORE,
  LABEL_STORE,
} from '../../../components/storefront/CuentaCard';
import { cuentaApi } from '../../../lib/cuenta';
import { ApiClientError } from '../../../lib/apiClient';
import { useLoginModal } from '../../../context/LoginModalContext';

export function RestablecerPage(): React.ReactElement {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { abrirLogin } = useLoginModal();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValida = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  const coinciden = password === confirmar;
  const puedeEnviar = token.length > 0 && passwordValida && coinciden;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (!puedeEnviar) return;
    setIsSubmitting(true);
    try {
      const json = await cuentaApi.restablecer(token, password);
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      void navigate('/', { replace: true });
      abrirLogin();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo restablecer la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <CuentaCard titulo="Enlace inválido" subtitulo="El enlace de recuperación está incompleto.">
        <Alerta tipo="error">No encontramos el token de recuperación.</Alerta>
        <p className="mt-lg text-center text-sm text-store-ink-soft">
          <Link to="/cuenta/recuperar" className="font-medium text-store-accent hover:underline">
            Solicitar un nuevo enlace
          </Link>
        </p>
      </CuentaCard>
    );
  }

  return (
    <CuentaCard titulo="Nueva contraseña" subtitulo="Crea una contraseña segura para tu cuenta.">
      <form onSubmit={onSubmit} noValidate className="space-y-md">
        {error && <Alerta tipo="error">{error}</Alerta>}

        <div>
          <label htmlFor="res-password" className={LABEL_STORE}>Nueva contraseña</label>
          <Input
            id="res-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            invalid={password.length > 0 && !passwordValida}
            className={INPUT_STORE}
          />
        </div>

        <div>
          <label htmlFor="res-confirmar" className={LABEL_STORE}>Confirmar contraseña</label>
          <Input
            id="res-confirmar"
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password"
            invalid={confirmar.length > 0 && !coinciden}
            className={INPUT_STORE}
          />
        </div>

        {password.length > 0 && !passwordValida && (
          <p role="alert" aria-live="polite" className="text-xs text-store-offer">
            Mínimo 8 caracteres, al menos una mayúscula y un número.
          </p>
        )}
        {confirmar.length > 0 && !coinciden && (
          <p role="alert" aria-live="polite" className="text-xs text-store-offer">
            Las contraseñas no coinciden.
          </p>
        )}

        <Button type="submit" isLoading={isSubmitting} disabled={!puedeEnviar} className={BOTON_STORE}>
          {isSubmitting ? 'Guardando…' : 'Restablecer contraseña'}
        </Button>
      </form>
    </CuentaCard>
  );
}

export default RestablecerPage;
