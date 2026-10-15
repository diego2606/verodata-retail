import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Alerta, BOTON_STORE, INPUT_STORE, LABEL_STORE } from './CuentaCard';
import { useAuth } from '../../context/AuthContext';
import { cuentaApi, urlGoogleOAuth } from '../../lib/cuenta';
import { ApiClientError } from '../../lib/apiClient';

const MAX_INTENTOS = 3;

function GoogleIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

interface LoginClienteFormProps {
  /** Cierra el modal contenedor (tras iniciar sesión o al navegar a otra pantalla). */
  onCerrar: () => void;
}

/** Formulario de acceso del cliente (se usa dentro del modal del header). */
export function LoginClienteForm({ onCerrar }: LoginClienteFormProps): React.ReactElement {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const json = await cuentaApi.login({ email: email.trim(), password, recordar });
      if (!json.success) {
        if (json.error.code === 'MAX_LOGIN_ATTEMPTS') setBloqueo(true);
        else setError(json.error.message);
        return;
      }
      login(
        json.data.token,
        {
          id: json.data.usuario.id,
          email: json.data.usuario.email,
          rol: json.data.usuario.rol,
          nombre: json.data.usuario.nombre,
        },
        recordar
      );
      onCerrar();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          window.location.href = urlGoogleOAuth();
        }}
        className="flex h-10 w-full items-center justify-center gap-sm rounded-md border border-store-line bg-store-surface text-sm font-medium text-store-ink transition-colors hover:bg-store-canvas"
      >
        <GoogleIcon />
        Continuar con Google
      </button>

      <div className="relative my-md flex items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-store-line" aria-hidden="true" />
        <span className="relative bg-store-surface px-sm text-xs text-store-ink-mute">o con tu correo</span>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        {error && <Alerta tipo="error">{error}</Alerta>}

        <div>
          <label htmlFor="login-email" className={LABEL_STORE}>Correo electrónico</label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            className={INPUT_STORE}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className={LABEL_STORE}>Contraseña</label>
            <Link
              to="/cuenta/recuperar"
              onClick={onCerrar}
              className="mb-xs text-xs font-medium text-store-accent hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className={INPUT_STORE}
          />
        </div>

        <label className="flex items-center gap-sm text-sm text-store-ink-soft">
          <input
            type="checkbox"
            checked={recordar}
            onChange={(e) => setRecordar(e.target.checked)}
            className="h-4 w-4 accent-store-ink"
          />
          Mantener mi sesión activa
        </label>

        <Button type="submit" isLoading={isSubmitting} className={BOTON_STORE}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      <p className="mt-lg text-center text-sm text-store-ink-soft">
        ¿No tienes cuenta?{' '}
        <Link to="/cuenta/registro" onClick={onCerrar} className="font-medium text-store-accent hover:underline">
          Regístrate
        </Link>
      </p>

      {bloqueo && (
        <Modal onClose={() => setBloqueo(false)} labelledBy="modal-seguridad-titulo" panelClassName="max-w-md">
          <div className="mb-md flex items-start justify-between gap-md">
            <div className="flex items-center gap-sm">
              <ShieldAlert size={18} className="text-store-offer" aria-hidden="true" />
              <h2 id="modal-seguridad-titulo" className="text-sm font-semibold text-ink">
                Alerta de seguridad
              </h2>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setBloqueo(false)} aria-label="Cerrar">
              <span aria-hidden="true">×</span>
            </Button>
          </div>

          <p className="text-sm text-ink-secondary">
            Detectamos <strong>{MAX_INTENTOS} intentos fallidos consecutivos</strong>. Por tu seguridad, hemos
            activado un bloqueo preventivo temporal. Espera <strong>5 minutos</strong> antes de volver a intentar
            o restablece tu contraseña.
          </p>

          <div className="mt-lg flex flex-col gap-sm">
            <Link
              to="/cuenta/recuperar"
              onClick={() => {
                setBloqueo(false);
                onCerrar();
              }}
              className="inline-flex h-9 items-center justify-center rounded-xs bg-primary px-sm text-sm font-medium text-on-primary"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <Button type="button" variant="secondary" onClick={() => setBloqueo(false)}>
              Entendido
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default LoginClienteForm;
