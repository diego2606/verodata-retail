import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  CuentaCard,
  Alerta,
  BOTON_STORE,
  INPUT_STORE,
  LABEL_STORE,
} from '../../../components/storefront/CuentaCard';
import { useAuth } from '../../../context/AuthContext';
import { useLoginModal } from '../../../context/LoginModalContext';
import { cuentaApi } from '../../../lib/cuenta';
import { ApiClientError } from '../../../lib/apiClient';
import type { TipoDocumento } from '../../../types/cuenta.types';

const SELECT_STORE =
  'h-9 w-full rounded-md border border-store-line bg-store-surface px-sm text-sm text-store-ink focus:outline-none focus:ring-1 focus:ring-store-accent';

const TIPOS: Array<{ value: TipoDocumento; label: string }> = [
  { value: 'DNI', label: 'DNI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CARNET_EXTRANJERIA', label: 'Carné de extranjería' },
];

export function RegistroPage(): React.ReactElement {
  const { login } = useAuth();
  const { abrirLogin } = useLoginModal();
  const navigate = useNavigate();

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValida = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  const coinciden = password === confirmar;
  const puedeEnviar =
    nombres.trim().length >= 2 &&
    apellidos.trim().length >= 2 &&
    numeroDocumento.trim().length >= 6 &&
    email.trim().length > 0 &&
    passwordValida &&
    coinciden;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (!puedeEnviar) return;
    setIsSubmitting(true);

    try {
      const registro = await cuentaApi.registrar({
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        password,
        telefono: telefono.trim() || undefined,
      });

      if (!registro.success) {
        setError(registro.error.message);
        return;
      }

      // Registro directo: iniciamos sesión automáticamente.
      const sesion = await cuentaApi.login({ email: email.trim(), password, recordar: true });
      if (!sesion.success) {
        abrirLogin();
        return;
      }
      login(
        sesion.data.token,
        {
          id: sesion.data.usuario.id,
          email: sesion.data.usuario.email,
          rol: sesion.data.usuario.rol,
          nombre: sesion.data.usuario.nombre,
        },
        true
      );
      void navigate('/cuenta/perfil', { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'No se pudo completar el registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CuentaCard titulo="Crear mi cuenta" subtitulo="Compra más rápido y sigue tus pedidos.">
      <form onSubmit={onSubmit} noValidate className="space-y-md">
        {error && <Alerta tipo="error">{error}</Alerta>}

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="reg-tipo" className={LABEL_STORE}>Tipo de documento</label>
            <select
              id="reg-tipo"
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
              className={SELECT_STORE}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reg-numero" className={LABEL_STORE}>Número de documento</label>
            <Input id="reg-numero" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} inputMode="numeric" className={INPUT_STORE} />
          </div>
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="reg-nombres" className={LABEL_STORE}>Nombres</label>
            <Input id="reg-nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="reg-apellidos" className={LABEL_STORE}>Apellidos</label>
            <Input id="reg-apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={INPUT_STORE} />
          </div>
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="reg-email" className={LABEL_STORE}>Correo electrónico</label>
            <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="reg-telefono" className={LABEL_STORE}>Teléfono (opcional)</label>
            <Input id="reg-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" className={INPUT_STORE} />
          </div>
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="reg-password" className={LABEL_STORE}>Contraseña</label>
            <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" invalid={password.length > 0 && !passwordValida} className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="reg-confirmar" className={LABEL_STORE}>Confirmar contraseña</label>
            <Input id="reg-confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" invalid={confirmar.length > 0 && !coinciden} className={INPUT_STORE} />
          </div>
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
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="mt-lg text-center text-sm text-store-ink-soft">
        ¿Ya tienes cuenta?{' '}
        <button type="button" onClick={abrirLogin} className="font-medium text-store-accent hover:underline">
          Ingresa
        </button>
      </p>
    </CuentaCard>
  );
}

export default RegistroPage;
