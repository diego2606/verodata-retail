import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

export function RecuperarPage(): React.ReactElement {
  const { abrirLogin } = useLoginModal();
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setMensaje(null);
    setToken(null);
    setIsSubmitting(true);
    try {
      const json = await cuentaApi.recuperar(email.trim());
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setMensaje(json.message);
      setToken(json.data.token);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CuentaCard
      titulo="Recuperar contraseña"
      subtitulo="Te enviaremos un enlace para crear una nueva. (Modo desarrollo: el enlace se muestra aquí)."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-md">
        {error && <Alerta tipo="error">{error}</Alerta>}
        {mensaje && !token && <Alerta tipo="info">{mensaje}</Alerta>}

        {token ? (
          <div className="space-y-md">
            <Alerta tipo="exito">
              Enlace de recuperación generado. Úsalo para crear tu nueva contraseña.
            </Alerta>
            <Link
              to={`/cuenta/restablecer?token=${token}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-store-ink text-sm font-semibold text-white transition-colors hover:bg-store-ink/90"
            >
              Restablecer contraseña ahora
            </Link>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="rec-email" className={LABEL_STORE}>Correo electrónico</label>
              <Input
                id="rec-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                className={INPUT_STORE}
              />
            </div>
            <Button type="submit" isLoading={isSubmitting} className={BOTON_STORE}>
              {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
            </Button>
          </>
        )}
      </form>

      <p className="mt-lg text-center text-sm text-store-ink-soft">
        <button type="button" onClick={abrirLogin} className="font-medium text-store-accent hover:underline">
          Volver a ingresar
        </button>
      </p>
    </CuentaCard>
  );
}

export default RecuperarPage;
