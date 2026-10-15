import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  CuentaCard,
  Alerta,
  BOTON_STORE,
  INPUT_STORE,
  LABEL_STORE,
} from '../../../components/storefront/CuentaCard';
import { useAuth } from '../../../context/AuthContext';
import { cuentaApi } from '../../../lib/cuenta';
import { ApiClientError } from '../../../lib/apiClient';

const MAX_INTENTOS = 3;

export function LoginClientePage(): React.ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      navigate('/cuenta/perfil', { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CuentaCard titulo="Ingresar a mi cuenta" subtitulo="Gestiona tus pedidos, direcciones y datos.">
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
            <Link to="/cuenta/recuperar" className="mb-xs text-xs font-medium text-store-accent hover:underline">
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
        <Link to="/cuenta/registro" className="font-medium text-store-accent hover:underline">
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
              <X size={15} aria-hidden="true" />
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
              onClick={() => setBloqueo(false)}
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
    </CuentaCard>
  );
}

export default LoginClientePage;
