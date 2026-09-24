import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAuth, type AuthUser } from '../../context/AuthContext';
import { apiClient, ApiClientError } from '../../lib/apiClient';

// ─── Schema de validación ─────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Tipos de respuesta del backend ──────────────────────────────────────────

interface LoginData {
  token: string;
  usuario: {
    id: string;
    email: string;
    rol: string;
  };
}

// ─── Subcomponente: columna de branding técnico ───────────────────────────────

const TECH_CHIPS = ['PostgreSQL', '3FN', 'ACID', 'RBAC', 'JWT'] as const;

function BrandPanel(): React.ReactElement {
  return (
    <aside className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-auth-canvas border-l border-auth-hairline p-huge">
      {/* Marca superior */}
      <div className="flex items-center gap-sm">
        <span className="inline-flex w-6 h-6 rounded-xs bg-auth-elevated border border-auth-hairline items-center justify-center shrink-0">
          <span className="text-primary font-mono font-bold text-xs leading-none">V</span>
        </span>
        <span className="text-xs font-mono uppercase tracking-widest text-auth-muted">
          VeroData Retail
        </span>
      </div>

      {/* Cita / resumen de arquitectura */}
      <div className="max-w-md">
        <p className="text-2xl font-medium leading-snug text-auth-text tracking-tight">
          Arquitectura limpia en 3FN, transacciones seguras de inventario y autenticación
          granular RBAC.
        </p>
        <p className="mt-md text-sm text-auth-muted leading-relaxed">
          Construido para operaciones retail de alto rendimiento.
        </p>

        <div className="mt-xl flex flex-wrap gap-xs">
          {TECH_CHIPS.map(chip => (
            <span
              key={chip}
              className="px-sm py-xxs rounded-xs border border-auth-hairline bg-auth-surface text-auth-muted font-mono text-xs"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Firma técnica */}
      <div className="flex items-center gap-md border-t border-auth-hairline pt-lg">
        <span
          className="inline-flex w-9 h-9 rounded-sm bg-auth-elevated border border-auth-hairline items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span className="text-primary font-mono text-xs font-bold leading-none">VD</span>
        </span>
        <div>
          <p className="text-sm font-medium text-auth-text leading-none">Equipo de Plataforma</p>
          <p className="mt-xxs text-xs font-mono text-auth-muted">VeroData Retail S.A.C.</p>
        </div>
      </div>
    </aside>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function LoginPage(): React.ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setServerError(null);
    setBloqueado(false);

    try {
      const json = await apiClient.post<LoginData>('/api/v1/auth/login', values);

      if (!json.success) {
        // CA04 (HU015): 3 intentos fallidos → modal de seguridad
        if (json.error.code === 'MAX_LOGIN_ATTEMPTS') {
          setBloqueado(true);
          return;
        }
        setServerError(json.error.message);
        return;
      }

      const authUser: AuthUser = {
        id: json.data.usuario.id,
        email: json.data.usuario.email,
        rol: json.data.usuario.rol as AuthUser['rol'],
      };
      login(json.data.token, authUser);
      navigate('/admin/dashboard', { replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiClientError
          ? error.message
          : 'Error de conexión. Verifica tu red e intenta nuevamente.'
      );
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-auth-surface">

      {/* ── Modal de bloqueo de seguridad (3 intentos) ────────────────────── */}
      {bloqueado && (
        <Modal
          onClose={() => setBloqueado(false)}
          labelledBy="modal-bloqueo-titulo"
          overlayClassName="bg-auth-canvas/80"
          panelClassName="max-w-sm border-auth-hairline bg-auth-surface"
        >
            <div className="flex items-center gap-sm mb-md">
              <AlertTriangle size={18} className="text-retail-red shrink-0" aria-hidden="true" />
              <h2 id="modal-bloqueo-titulo" className="text-sm font-medium text-auth-text">
                Acceso bloqueado preventivamente
              </h2>
            </div>
            <p className="text-xs text-auth-muted leading-relaxed mb-lg">
              Detectamos 3 intentos fallidos consecutivos en esta cuenta. Por tu seguridad, el
              acceso ha sido suspendido temporalmente.
            </p>
            <div className="flex flex-col gap-xs">
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={() => setShowHelp(true)}
              >
                Restablecer contraseña
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-auth-muted hover:bg-auth-canvas hover:text-auth-text"
                onClick={() => setBloqueado(false)}
              >
                Esperar e intentar de nuevo
              </Button>
            </div>
        </Modal>
      )}

      {/* ── Columna izquierda: formulario ─────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col">

        {/* Logo superior */}
        <div className="flex items-center gap-sm px-xl py-lg">
          <span className="inline-flex w-7 h-7 rounded-sm bg-auth-elevated border border-auth-hairline items-center justify-center shrink-0">
            <span className="text-primary font-mono font-bold text-sm leading-none">V</span>
          </span>
          <span className="text-sm font-medium text-auth-text tracking-tight">VeroData Retail</span>
        </div>

        {/* Formulario centrado */}
        <div className="flex flex-1 items-center justify-center px-xl">
          <div className="w-full max-w-sm">

            <div className="mb-xl">
              <h1 className="text-2xl font-semibold text-auth-text">Welcome back</h1>
              <p className="mt-xs text-sm text-auth-muted">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-md">

              {/* Error de servidor */}
              {serverError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-xs rounded-xs border border-retail-red/40 bg-retail-red/10 p-sm"
                >
                  <AlertTriangle size={13} className="text-retail-red shrink-0 mt-px" aria-hidden="true" />
                  <p className="text-xs text-auth-text">{serverError}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-auth-text mb-xs">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  placeholder="admin@verodata.com"
                  className={cn(
                    'bg-auth-canvas text-auth-text placeholder:text-auth-muted',
                    !errors.email && 'border-auth-hairline'
                  )}
                  {...register('email')}
                />
                {errors.email && (
                  <p id="email-error" role="alert" aria-live="polite" className="mt-xs text-xs text-retail-red">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-xs">
                  <label htmlFor="password" className="text-xs font-medium text-auth-text">
                    Password
                  </label>
                  <Button
                    type="button"
                    variant="link"
                    size="none"
                    onClick={() => setShowHelp(v => !v)}
                    className="text-xs text-auth-muted hover:text-primary"
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    placeholder="••••••••"
                    className={cn(
                      'bg-auth-canvas text-auth-text placeholder:text-auth-muted pr-9',
                      !errors.password && 'border-auth-hairline'
                    )}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-sm top-1/2 -translate-y-1/2 text-auth-muted hover:bg-transparent hover:text-auth-text"
                  >
                    {showPassword ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                  </Button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" aria-live="polite" className="mt-xs text-xs text-retail-red">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Ayuda de restablecimiento */}
              {showHelp && (
                <p
                  aria-live="polite"
                  className="flex items-start gap-xs rounded-xs border border-auth-hairline bg-auth-canvas p-sm text-xs text-auth-muted"
                >
                  <ShieldCheck size={13} className="mt-px shrink-0 text-primary" aria-hidden="true" />
                  Solicita el restablecimiento de tu contraseña a un Super Administrador.
                </p>
              )}

              {/* Submit */}
              <Button type="submit" isLoading={isSubmitting} className="w-full">
                {isSubmitting ? 'Verificando…' : 'Sign in'}
              </Button>
            </form>

            {/* Seguridad */}
            <div className="mt-lg flex items-center justify-center gap-xs text-xs text-auth-muted">
              <Lock size={12} aria-hidden="true" />
              <span>Conexión cifrada — acceso restringido al personal autorizado</span>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <footer className="px-xl py-lg">
          <p className="text-xs text-auth-muted">
            © {new Date().getFullYear()} VeroData Retail S.A.C. —{' '}
            <a href="#" className="transition-colors hover:text-auth-text">Términos</a>
            {' · '}
            <a href="#" className="transition-colors hover:text-auth-text">Privacidad</a>
          </p>
        </footer>
      </div>

      {/* ── Columna derecha: branding ─────────────────────────────────────── */}
      <BrandPanel />
    </div>
  );
}

export default LoginPage;
