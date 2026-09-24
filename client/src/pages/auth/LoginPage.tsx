import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Package,
  ShieldCheck,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAuth, type AuthUser } from '../../context/AuthContext';
import { apiClient, ApiClientError } from '../../lib/apiClient';

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginData {
  token: string;
  usuario: { id: string; email: string; rol: string };
}

// ─── Panel izquierdo (marca) ──────────────────────────────────────────────────

interface SystemStatus {
  version: string;
  db: 'ok' | 'down';
  latencyMs: number;
  categoriasActivas: number;
  productosActivos: number;
  uptimeSeconds: number;
}

type StatusLoadState = 'loading' | 'ready' | 'error';

interface StatusCard {
  title: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  down: boolean;
}

function StatusCardView({ card }: { card: StatusCard }): React.ReactElement {
  const Icon = card.icon;
  return (
    <div className="flex w-[240px] flex-col gap-3 rounded-lg border border-[#1F2231] bg-[#12141C]/90 p-[18px]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase leading-[14px] text-[#9CA3AF]">
          {card.title}
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#10B981]/[0.078]">
          <Icon size={14} className="text-[#10B981]" aria-hidden="true" />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[22px] font-bold leading-[29px] tabular-nums text-[#F3F4F6]">
          {card.value}
        </span>
        <div className="flex items-center gap-1">
          <span
            className={cn('h-1.5 w-1.5 rounded-full', card.down ? 'bg-retail-red' : 'bg-[#10B981]')}
            aria-hidden="true"
          />
          <span
            className={cn(
              'font-mono text-[11px] leading-[14px]',
              card.down ? 'text-retail-red' : 'text-[#10B981]'
            )}
          >
            {card.caption}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusCardSkeleton(): React.ReactElement {
  return (
    <div
      className="flex w-[240px] flex-col gap-3 rounded-lg border border-[#1F2231] bg-[#12141C]/90 p-[18px]"
      aria-busy="true"
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
        <div className="h-6 w-6 animate-pulse rounded-sm bg-white/10" />
      </div>
      <div className="h-6 w-24 animate-pulse rounded-sm bg-white/10" />
      <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

function BrandPanel({
  status,
  statusState,
}: {
  status: SystemStatus | null;
  statusState: StatusLoadState;
}): React.ReactElement {
  const dbOk = status?.db === 'ok';

  const cards: StatusCard[] = status
    ? [
        {
          title: 'Catálogo',
          value: String(status.productosActivos),
          caption: `${status.categoriasActivas} categorías activas`,
          icon: Package,
          down: false,
        },
        {
          title: 'Latencia',
          value: `${status.latencyMs} ms`,
          caption: dbOk ? 'Base de datos operativa' : 'Sin conexión a la base',
          icon: Database,
          down: !dbOk,
        },
      ]
    : [];

  return (
    <aside
      className="relative hidden lg:flex lg:w-[43.06%] shrink-0 flex-col justify-between overflow-hidden border-r border-[#1F2231] p-12"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(12,13,18,0.901961) 0%, rgba(18,20,28,0.952941) 100%), url('/brand/image_admin_login.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* panel-top */}
      <div className="flex flex-col gap-6">
        {/* logo */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#10B981] bg-[#10B981]/10">
            <Terminal size={16} className="text-[#10B981]" aria-hidden="true" />
          </span>
          <span className="font-mono text-sm font-bold leading-[18px] text-[#F3F4F6]">
            VeroData Retail
          </span>
        </div>

        {/* value-proposition */}
        <div className="flex flex-col gap-4">
          <p className="text-[40px] font-bold leading-[1.2] text-[#F3F4F6]">
            Operación retail sin sobreventa ni pérdida de trazabilidad.
          </p>
          <p className="text-base font-normal leading-[1.6] text-[#9CA3AF]">
            Plataforma omnicanal con inventario atómico, pedidos con snapshot inmutable y control de
            accesos por rol.
          </p>
        </div>
      </div>

      {/* technical-showcase */}
      <div className="flex flex-col gap-4">
        <span className="font-mono text-[11px] font-semibold uppercase leading-[14px] text-[#9CA3AF]">
          Estado del sistema
        </span>
        <div className="flex flex-wrap gap-4">
          {statusState === 'loading' && (
            <>
              <StatusCardSkeleton />
              <StatusCardSkeleton />
            </>
          )}
          {statusState === 'error' && (
            <>
              <StatusCardView
                card={{ title: 'Catálogo', value: '—', caption: 'No disponible', icon: Package, down: true }}
              />
              <StatusCardView
                card={{ title: 'Latencia', value: '—', caption: 'No disponible', icon: Database, down: true }}
              />
            </>
          )}
          {statusState === 'ready' &&
            cards.map(card => <StatusCardView key={card.title} card={card} />)}
        </div>
      </div>

      {/* panel-footer */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            statusState === 'loading' ? 'bg-[#4B5563]' : dbOk ? 'bg-[#10B981]' : 'bg-retail-red'
          )}
          aria-hidden="true"
        />
        <span className="font-mono text-xs leading-4 text-[#9CA3AF]">
          {statusState === 'loading'
            ? 'Verificando estado…'
            : dbOk
              ? 'Todos los sistemas operativos'
              : 'Servicio degradado'}
        </span>
      </div>
    </aside>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function LoginPage(): React.ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [statusState, setStatusState] = useState<StatusLoadState>('loading');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // Estado público del sistema (tarjetas del panel de marca)
  useEffect(() => {
    let active = true;
    apiClient
      .get<SystemStatus>('/api/v1/status')
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setStatusState('error');
          return;
        }
        setStatus(json.data);
        setStatusState('ready');
      })
      .catch(() => {
        if (active) setStatusState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setServerError(null);
    setBloqueado(false);

    try {
      const json = await apiClient.post<LoginData>('/api/v1/auth/login', { ...values, recordar });

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
      login(json.data.token, authUser, recordar);
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
    <div className="flex min-h-screen w-full bg-[#0C0D12]">
      {/* ── Modal de bloqueo de seguridad (3 intentos) ────────────────────── */}
      {bloqueado && (
        <Modal
          onClose={() => setBloqueado(false)}
          labelledBy="modal-bloqueo-titulo"
          overlayClassName="bg-[#0C0D12]/80"
          panelClassName="max-w-sm border-[#1F2231] bg-[#12141C]"
        >
          <div className="mb-md flex items-center gap-sm">
            <AlertTriangle size={18} className="shrink-0 text-retail-red" aria-hidden="true" />
            <h2 id="modal-bloqueo-titulo" className="text-sm font-medium text-[#F3F4F6]">
              Acceso bloqueado preventivamente
            </h2>
          </div>
          <p className="mb-lg text-xs leading-relaxed text-[#9CA3AF]">
            Detectamos 3 intentos fallidos consecutivos en esta cuenta. Por tu seguridad, el acceso
            ha sido suspendido temporalmente.
          </p>
          <div className="flex flex-col gap-xs">
            <Button type="button" size="sm" className="w-full" onClick={() => setShowHelp(true)}>
              Restablecer contraseña
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-[#9CA3AF] hover:bg-[#090A0F] hover:text-[#F3F4F6]"
              onClick={() => setBloqueado(false)}
            >
              Esperar e intentar de nuevo
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Panel izquierdo (marca) ───────────────────────────────────────── */}
      <BrandPanel status={status} statusState={statusState} />

      {/* ── Panel derecho (formulario) ────────────────────────────────────── */}
      <div className="flex w-full flex-col bg-[#0C0D12] px-6 pb-12 pt-16 lg:flex-1 lg:px-[120px] lg:pb-12">
        {/* top-actions */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs leading-4 text-[#4B5563]">v{status?.version ?? '1.0.0'}</span>
          <Link
            to="/documentacion"
            className="flex items-center gap-1.5 font-mono text-xs leading-4 text-[#9CA3AF] transition-colors hover:text-[#F3F4F6]"
          >
            Documentación
            <ExternalLink size={12} className="text-[#6B7280]" aria-hidden="true" />
          </Link>
        </div>

        {/* form-card */}
        <div className="flex flex-1 items-center justify-center py-xxl">
          <div className="flex w-full max-w-[400px] flex-col gap-8">
            {/* form-header */}
            <div className="flex flex-col gap-3">
              <h1 className="text-[28px] font-bold leading-9 text-[#F3F4F6]">Bienvenido de nuevo</h1>
              <p className="text-sm font-normal leading-[1.5] text-[#9CA3AF]">
                Inicia sesión en tu cuenta administrativa para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
              {serverError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-xs rounded-md border border-retail-red/40 bg-retail-red/10 p-sm"
                >
                  <AlertTriangle size={13} className="mt-px shrink-0 text-retail-red" aria-hidden="true" />
                  <p className="text-xs text-[#F3F4F6]">{serverError}</p>
                </div>
              )}

              {/* form-inputs */}
              <div className="flex flex-col gap-5">
                {/* Correo */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="font-mono text-[11px] font-semibold uppercase leading-[14px] text-[#9CA3AF]"
                  >
                    Correo institucional
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    placeholder="admin@verodata.com"
                    className="h-[46px] rounded-md border-[#1F2231] bg-[#090A0F] px-4 text-sm text-[#F3F4F6] placeholder:text-[#4B5563] focus:border-[#10B981] focus:ring-[#10B981]"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" aria-live="polite" className="text-xs text-retail-red">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Contraseña */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="password"
                    className="font-mono text-[11px] font-semibold uppercase leading-[14px] text-[#9CA3AF]"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      placeholder="••••••••"
                      className="h-[46px] rounded-md border-[#1F2231] bg-[#090A0F] px-4 pr-12 text-sm text-[#F3F4F6] placeholder:text-[#4B5563] focus:border-[#10B981] focus:ring-[#10B981]"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#9CA3AF] transition-colors hover:text-[#F3F4F6]"
                    >
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" role="alert" aria-live="polite" className="text-xs text-retail-red">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* form-options */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[13px] leading-[17px] text-[#9CA3AF]">
                  <input
                    type="checkbox"
                    checked={recordar}
                    onChange={e => setRecordar(e.target.checked)}
                    className="h-4 w-4 rounded-xs accent-[#10B981]"
                  />
                  Recordarme
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(v => !v)}
                  className="text-[13px] font-medium leading-[17px] text-[#10B981] underline underline-offset-2"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {showHelp && (
                <p
                  aria-live="polite"
                  className="flex items-start gap-xs rounded-md border border-[#1F2231] bg-[#090A0F] p-sm text-xs text-[#9CA3AF]"
                >
                  <ShieldCheck size={13} className="mt-px shrink-0 text-[#10B981]" aria-hidden="true" />
                  Solicita el restablecimiento de tu contraseña a un Super Administrador.
                </p>
              )}

              {/* form-actions */}
              <div className="flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#10B981] text-sm font-semibold text-[#090A0F] shadow-[0_4px_12px_rgba(16,185,129,0.15)] transition-colors duration-150 hover:bg-[#0ea472] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-[#090A0F]/30 border-t-[#090A0F]"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting ? 'Verificando…' : 'Ingresar'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* right-footer */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-full max-w-[400px] bg-[#1F2231]" />
          <div className="flex items-center gap-4 font-mono text-[11px] leading-[14px] text-[#4B5563]">
            <a href="#" className="transition-colors hover:text-[#9CA3AF]">Términos</a>
            <span className="h-1 w-1 rounded-full bg-[#4B5563]" aria-hidden="true" />
            <a href="#" className="transition-colors hover:text-[#9CA3AF]">Privacidad</a>
          </div>
          <p className="text-center font-mono text-[11px] leading-[14px] text-[#4B5563]">
            © {new Date().getFullYear()} VeroData Retail S.A.C.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
