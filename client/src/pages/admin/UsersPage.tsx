import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import type {
  ActualizarUsuarioPayload,
  CrearUsuarioPayload,
  RolOption,
  RolUsuario,
  UsuarioListItem,
} from '../../types/user.types';

// ─── Schema del modal de creación (espejo del backend) ────────────────────────

const crearUsuarioSchema = z.object({
  id_rol: z.number().int().positive('Selecciona un rol'),
  tipo_documento: z.enum(['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA']),
  numero_documento: z.string().trim().min(6, 'Mínimo 6 caracteres').max(20, 'Máximo 20 caracteres'),
  nombres: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100),
  apellidos: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().trim().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'Debe incluir una mayúscula y un número'),
  telefono: z.string().trim().max(20).optional().or(z.literal('')),
});

type CrearUsuarioFormValues = z.infer<typeof crearUsuarioSchema>;

// ─── Schema del modal de edición (HU005 — sin password ni rol) ────────────────

const editarUsuarioSchema = z.object({
  tipo_documento: z.enum(['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA']),
  numero_documento: z.string().trim().min(6, 'Mínimo 6 caracteres').max(20, 'Máximo 20 caracteres'),
  nombres: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100),
  apellidos: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().trim().email('Email inválido'),
  telefono: z.string().trim().max(20).optional().or(z.literal('')),
});

type EditarUsuarioFormValues = z.infer<typeof editarUsuarioSchema>;

// ─── Helpers de presentación ──────────────────────────────────────────────────

const ROL_BADGE: Record<RolUsuario, string> = {
  SUPER_ADMIN: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  ADMIN: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  CLIENTE: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
};

const TIPO_DOCUMENTO_OPTIONS: SelectOption[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'CARNET_EXTRANJERIA', label: 'Carnet de extranjería' },
];

const ROL_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos los roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CLIENTE', label: 'Cliente' },
];

const ESTADO_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'bloqueado', label: 'Bloqueados' },
];

function RolBadge({ rol }: { rol: RolUsuario }): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs border px-xs py-xxs font-mono text-xs leading-none',
        ROL_BADGE[rol]
      )}
    >
      {rol}
    </span>
  );
}

function EstadoBadge({ bloqueado }: { bloqueado: boolean }): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-xs border px-xs py-xxs text-xs leading-none',
        bloqueado
          ? 'border-retail-red/20 bg-retail-red/10 text-retail-red'
          : 'border-primary/20 bg-primary/10 text-primary-ink'
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', bloqueado ? 'bg-retail-red' : 'bg-primary')}
        aria-hidden="true"
      />
      {bloqueado ? 'Bloqueado' : 'Activo'}
    </span>
  );
}

// ─── Tabla: cabecera compartida (evita saltos de layout en loading) ───────────

const COLUMNS = ['Documento', 'Nombres y Apellidos', 'Email', 'Rol', 'Estado'] as const;

function TableHeader(): React.ReactElement {
  return (
    <thead>
      <tr className="border-b border-hairline bg-canvas-soft">
        {COLUMNS.map(label => (
          <th
            key={label}
            className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute"
          >
            {label}
          </th>
        ))}
        <th className="px-3 py-2.5 text-right font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
          Acciones
        </th>
      </tr>
    </thead>
  );
}

function TableSkeleton(): React.ReactElement {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Cargando colaboradores">
      <table className="w-full border-collapse">
        <TableHeader />
        <tbody className="divide-y divide-hairline-cool">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5"><div className="h-3 w-24 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-40 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-52 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-4 w-20 rounded-xs bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-4 w-16 rounded-xs bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="ml-auto h-5 w-20 rounded-xs bg-hairline-cool animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Estados de pantalla ──────────────────────────────────────────────────────

interface EmptyStateProps {
  filtered: boolean;
  onCreate: () => void;
  onClear: () => void;
}

function EmptyState({ filtered, onCreate, onClear }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-hairline bg-canvas-soft" aria-hidden="true">
        {filtered ? (
          <Search size={18} className="text-ink-faint" />
        ) : (
          <UserRound size={18} className="text-ink-faint" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-ink">
          {filtered ? 'Sin resultados' : 'Sin colaboradores'}
        </p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          {filtered
            ? 'Ningún colaborador coincide con la búsqueda o los filtros aplicados.'
            : 'Aún no hay usuarios internos. Registra al primer miembro del equipo.'}
        </p>
      </div>
      {filtered ? (
        <Button type="button" variant="secondary" size="sm" onClick={onClear}>
          Limpiar filtros
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus size={13} aria-hidden="true" />
          New User
        </Button>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-retail-red/20 bg-retail-red/5" aria-hidden="true">
        <AlertTriangle size={18} className="text-retail-red" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">No se pudo cargar la lista</p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          Ocurrió un error al consultar los colaboradores. Vuelve a intentarlo.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

// ─── Modal de creación ────────────────────────────────────────────────────────

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: (message: string) => void;
}

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  if (!message) return null;
  return (
    <p role="alert" aria-live="polite" className="mt-xs text-xs text-retail-red">
      {message}
    </p>
  );
}

const labelClass = 'block text-xs font-medium text-ink mb-xs';

function CreateUserModal({ onClose, onCreated }: CreateUserModalProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RolOption[]>([]);
  const [rolesStatus, setRolesStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CrearUsuarioFormValues>({
    resolver: zodResolver(crearUsuarioSchema),
    defaultValues: { tipo_documento: 'DNI' },
  });

  // Catálogo de roles (id_rol — 3FN)
  useEffect(() => {
    let active = true;
    apiClient
      .get<RolOption[]>('/api/v1/roles')
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setRolesStatus('error');
          return;
        }
        const internos = json.data.filter(r => r.nombre !== 'CLIENTE');
        setRoles(internos);
        const preferido = internos.find(r => r.nombre === 'ADMIN') ?? internos[0];
        if (preferido) setValue('id_rol', preferido.id);
        setRolesStatus('ready');
      })
      .catch(() => {
        if (active) setRolesStatus('error');
      });
    return () => {
      active = false;
    };
  }, [setValue]);

  const onSubmit = async (values: CrearUsuarioFormValues): Promise<void> => {
    setServerError(null);

    const payload: CrearUsuarioPayload = {
      id_rol: values.id_rol,
      tipo_documento: values.tipo_documento,
      numero_documento: values.numero_documento,
      nombres: values.nombres,
      apellidos: values.apellidos,
      email: values.email,
      password: values.password,
      telefono: values.telefono ? values.telefono : undefined,
    };

    try {
      const json = await apiClient.post<{ id: string; email: string }>('/api/v1/users', payload);
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onCreated(`Colaborador ${json.data.email} registrado`);
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="crear-usuario-titulo" panelClassName="max-w-lg">
        <div className="mb-lg flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <ShieldCheck size={16} className="text-primary-ink" aria-hidden="true" />
            <h2 id="crear-usuario-titulo" className="text-sm font-medium text-ink">
              Nuevo colaborador interno
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X size={15} aria-hidden="true" />
          </Button>
        </div>

        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-md flex items-start gap-xs rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm"
          >
            <AlertTriangle size={13} className="mt-px shrink-0 text-retail-red" aria-hidden="true" />
            <p className="text-xs text-ink-secondary">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="tipo_documento" className={labelClass}>
                Tipo de documento
              </label>
              <Controller
                name="tipo_documento"
                control={control}
                render={({ field }) => (
                  <Select
                    id="tipo_documento"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    options={TIPO_DOCUMENTO_OPTIONS}
                    invalid={!!errors.tipo_documento}
                  />
                )}
              />
              <FieldError message={errors.tipo_documento?.message} />
            </div>
            <div>
              <label htmlFor="numero_documento" className={labelClass}>
                Número de documento
              </label>
              <Input
                id="numero_documento"
                invalid={!!errors.numero_documento}
                className="font-mono tabular-nums"
                placeholder="71234567"
                {...register('numero_documento')}
              />
              <FieldError message={errors.numero_documento?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="nombres" className={labelClass}>
                Nombres
              </label>
              <Input id="nombres" invalid={!!errors.nombres} {...register('nombres')} />
              <FieldError message={errors.nombres?.message} />
            </div>
            <div>
              <label htmlFor="apellidos" className={labelClass}>
                Apellidos
              </label>
              <Input id="apellidos" invalid={!!errors.apellidos} {...register('apellidos')} />
              <FieldError message={errors.apellidos?.message} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              invalid={!!errors.email}
              placeholder="colaborador@verodata.com"
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="password" className={labelClass}>
                Contraseña temporal
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.password}
                placeholder="••••••••"
                {...register('password')}
              />
              <FieldError message={errors.password?.message} />
            </div>
            <div>
              <label htmlFor="telefono" className={labelClass}>
                Teléfono <span className="text-ink-faint">(opcional)</span>
              </label>
              <Input
                id="telefono"
                invalid={!!errors.telefono}
                className="tabular-nums"
                {...register('telefono')}
              />
              <FieldError message={errors.telefono?.message} />
            </div>
          </div>

          <div>
            <label htmlFor="id_rol" className={labelClass}>
              Rol
            </label>
            {rolesStatus === 'loading' && (
              <div className="h-9 rounded-xs bg-hairline-cool animate-pulse" aria-busy="true" />
            )}
            {rolesStatus === 'error' && (
              <p className="rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary">
                No se pudieron cargar los roles. Cierra el modal y vuelve a intentarlo.
              </p>
            )}
            {rolesStatus === 'ready' && (
              <>
                <Controller
                  name="id_rol"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="id_rol"
                      value={field.value !== undefined ? String(field.value) : ''}
                      onChange={value => field.onChange(Number(value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="Seleccionar rol"
                      options={roles.map(role => ({ value: String(role.id), label: role.nombre }))}
                      invalid={!!errors.id_rol}
                    />
                  )}
                />
                <FieldError message={errors.id_rol?.message} />
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-sm pt-md">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={rolesStatus !== 'ready'}>
              {isSubmitting ? 'Registrando…' : 'Registrar colaborador'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

// ─── Modal de edición (HU005) ─────────────────────────────────────────────────

interface EditUserModalProps {
  usuario: UsuarioListItem;
  onClose: () => void;
  onUpdated: (message: string) => void;
}

function EditUserModal({ usuario, onClose, onUpdated }: EditUserModalProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditarUsuarioFormValues>({
    resolver: zodResolver(editarUsuarioSchema),
    defaultValues: {
      tipo_documento: usuario.tipo_documento ?? 'DNI',
      numero_documento: usuario.numero_documento ?? '',
      nombres: usuario.nombres ?? '',
      apellidos: usuario.apellidos ?? '',
      email: usuario.email,
      telefono: usuario.telefono ?? '',
    },
  });

  const onSubmit = async (values: EditarUsuarioFormValues): Promise<void> => {
    setServerError(null);

    const payload: ActualizarUsuarioPayload = {
      tipo_documento: values.tipo_documento,
      numero_documento: values.numero_documento,
      nombres: values.nombres,
      apellidos: values.apellidos,
      email: values.email,
      telefono: values.telefono ? values.telefono : undefined,
    };

    try {
      const json = await apiClient.patch<UsuarioListItem>(`/api/v1/users/${usuario.id}`, payload);
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onUpdated(`Colaborador ${json.data.email} actualizado`);
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="editar-usuario-titulo" panelClassName="max-w-lg">
        <div className="mb-lg flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Pencil size={16} className="text-primary-ink" aria-hidden="true" />
            <h2 id="editar-usuario-titulo" className="text-sm font-medium text-ink">
              Editar colaborador
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X size={15} aria-hidden="true" />
          </Button>
        </div>

        {serverError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-md flex items-start gap-xs rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm"
          >
            <AlertTriangle size={13} className="mt-px shrink-0 text-retail-red" aria-hidden="true" />
            <p className="text-xs text-ink-secondary">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="edit-tipo_documento" className={labelClass}>
                Tipo de documento
              </label>
              <Controller
                name="tipo_documento"
                control={control}
                render={({ field }) => (
                  <Select
                    id="edit-tipo_documento"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    options={TIPO_DOCUMENTO_OPTIONS}
                    invalid={!!errors.tipo_documento}
                  />
                )}
              />
              <FieldError message={errors.tipo_documento?.message} />
            </div>
            <div>
              <label htmlFor="edit-numero_documento" className={labelClass}>
                Número de documento
              </label>
              <Input
                id="edit-numero_documento"
                invalid={!!errors.numero_documento}
                className="font-mono tabular-nums"
                {...register('numero_documento')}
              />
              <FieldError message={errors.numero_documento?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="edit-nombres" className={labelClass}>
                Nombres
              </label>
              <Input id="edit-nombres" invalid={!!errors.nombres} {...register('nombres')} />
              <FieldError message={errors.nombres?.message} />
            </div>
            <div>
              <label htmlFor="edit-apellidos" className={labelClass}>
                Apellidos
              </label>
              <Input id="edit-apellidos" invalid={!!errors.apellidos} {...register('apellidos')} />
              <FieldError message={errors.apellidos?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="edit-email" className={labelClass}>
                Email
              </label>
              <Input id="edit-email" type="email" invalid={!!errors.email} {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <label htmlFor="edit-telefono" className={labelClass}>
                Teléfono <span className="text-ink-faint">(opcional)</span>
              </label>
              <Input
                id="edit-telefono"
                invalid={!!errors.telefono}
                className="tabular-nums"
                {...register('telefono')}
              />
              <FieldError message={errors.telefono?.message} />
            </div>
          </div>

          <p className="rounded-xs border border-hairline-cool bg-canvas-soft px-sm py-xs text-xs text-ink-mute">
            La contraseña y el rol no se modifican desde aquí (HU005).
          </p>

          <div className="flex items-center justify-end gap-sm pt-md">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

// ─── Diálogo de confirmación de bloqueo ───────────────────────────────────────

interface ConfirmBloqueoProps {
  usuario: UsuarioListItem;
  next: boolean;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmBloqueo({
  usuario,
  next,
  isProcessing,
  onCancel,
  onConfirm,
}: ConfirmBloqueoProps): React.ReactElement {
  const nombre = [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ') || usuario.email;
  const Icon: LucideIcon = next ? Lock : LockOpen;

  return (
    <Modal onClose={onCancel} labelledBy="confirmar-bloqueo-titulo" panelClassName="max-w-sm">
        <div className="mb-md flex items-center gap-sm">
          <Icon size={16} className={next ? 'text-retail-red' : 'text-primary-ink'} aria-hidden="true" />
          <h2 id="confirmar-bloqueo-titulo" className="text-sm font-medium text-ink">
            {next ? 'Bloquear cuenta' : 'Desbloquear cuenta'}
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-ink-mute">
          {next
            ? 'El colaborador no podrá iniciar sesión hasta que se desbloquee la cuenta.'
            : 'Se restablecerán los intentos fallidos y el colaborador podrá iniciar sesión nuevamente.'}
        </p>
        <p className="mt-sm rounded-xs border border-hairline-cool bg-canvas-soft px-sm py-xs font-mono text-xs text-ink">
          {nombre}
        </p>
        <div className="mt-lg flex items-center justify-end gap-sm">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={next ? 'danger' : 'primary'}
            isLoading={isProcessing}
            onClick={onConfirm}
          >
            {isProcessing ? 'Procesando…' : next ? 'Bloquear' : 'Desbloquear'}
          </Button>
        </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export function UsersPage(): React.ReactElement {
  const { usuario: sesion } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rolFilter, setRolFilter] = useState<'' | RolUsuario>('');
  const [estadoFilter, setEstadoFilter] = useState<'' | 'activo' | 'bloqueado'>('');

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UsuarioListItem | null>(null);
  const [pending, setPending] = useState<{ usuario: UsuarioListItem; next: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Debounce del buscador
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Carga de datos
  useEffect(() => {
    let active = true;
    setStatus('loading');

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (rolFilter) params.set('rol', rolFilter);
    if (estadoFilter) params.set('bloqueado', estadoFilter === 'bloqueado' ? 'true' : 'false');
    const qs = params.toString();

    apiClient
      .get<UsuarioListItem[]>(`/api/v1/users${qs ? `?${qs}` : ''}`)
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setUsuarios(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, rolFilter, estadoFilter, reloadKey]);

  // Auto-dismiss del toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const reload = useCallback((): void => setReloadKey(k => k + 1), []);

  const clearFilters = useCallback((): void => {
    setSearch('');
    setRolFilter('');
    setEstadoFilter('');
  }, []);

  const handleCreated = useCallback(
    (message: string): void => {
      setShowCreate(false);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const handleUpdated = useCallback(
    (message: string): void => {
      setEditing(null);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const confirmBloqueo = useCallback(async (): Promise<void> => {
    if (!pending) return;
    setIsProcessing(true);
    try {
      const json = await apiClient.patch<{ id: string; bloqueado: boolean }>(
        `/api/v1/users/${pending.usuario.id}/bloqueo`,
        { bloqueado: pending.next }
      );
      if (!json.success) {
        setToast({ type: 'error', message: json.error.message });
      } else {
        setToast({
          type: 'success',
          message: pending.next ? 'Cuenta bloqueada' : 'Cuenta desbloqueada',
        });
        reload();
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof ApiClientError ? error.message : 'Error al actualizar la cuenta',
      });
    } finally {
      setIsProcessing(false);
      setPending(null);
    }
  }, [pending, reload]);

  const hayFiltros = useMemo(
    () => Boolean(debouncedSearch || rolFilter || estadoFilter),
    [debouncedSearch, rolFilter, estadoFilter]
  );

  return (
    <div>

      {/* Encabezado */}
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="text-heading-lg font-medium text-ink">Gestión de colaboradores</h1>
          <p className="mt-xs text-sm text-ink-mute">
            Personal interno con acceso al panel administrativo.
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate(true)}>
          <Plus size={15} aria-hidden="true" />
          New User
        </Button>
      </div>

      {/* Barra de filtros */}
      <div className="mb-md flex flex-wrap items-center gap-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email o documento…"
            aria-label="Buscar colaborador por email o documento"
            className="pl-xl"
          />
        </div>
        <Select
          value={rolFilter}
          onChange={value => setRolFilter(value as '' | RolUsuario)}
          options={ROL_FILTER_OPTIONS}
          aria-label="Filtrar por rol"
          containerClassName="relative min-w-[160px]"
        />
        <Select
          value={estadoFilter}
          onChange={value => setEstadoFilter(value as '' | 'activo' | 'bloqueado')}
          options={ESTADO_FILTER_OPTIONS}
          aria-label="Filtrar por estado"
          containerClassName="relative min-w-[160px]"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        {status === 'loading' && <TableSkeleton />}
        {status === 'error' && <ErrorState onRetry={reload} />}
        {status === 'ready' && usuarios.length === 0 && (
          <EmptyState
            filtered={hayFiltros}
            onCreate={() => setShowCreate(true)}
            onClear={clearFilters}
          />
        )}

        {status === 'ready' && usuarios.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHeader />
              <tbody className="divide-y divide-hairline-cool">
                {usuarios.map(u => {
                  const esUnoMismo = sesion?.id === u.id;
                  return (
                    <tr key={u.id} className="transition-colors duration-150 hover:bg-canvas-soft">
                      <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-ink">
                        {u.numero_documento ? (
                          <>
                            <span className="text-ink-mute">{u.tipo_documento}</span>{' '}
                            <span className="text-ink">{u.numero_documento}</span>
                          </>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-ink">
                        {[u.nombres, u.apellidos].filter(Boolean).join(' ') || (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-ink-secondary">{u.email}</td>
                      <td className="px-3 py-2.5">
                        <RolBadge rol={u.rol} />
                      </td>
                      <td className="px-3 py-2.5">
                        <EstadoBadge bloqueado={u.bloqueado} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-xs">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditing(u)}
                          >
                            <Pencil size={12} aria-hidden="true" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={esUnoMismo}
                            title={esUnoMismo ? 'No puedes bloquear tu propia cuenta' : undefined}
                            onClick={() => setPending({ usuario: u, next: !u.bloqueado })}
                            className={cn(
                              u.bloqueado && 'border-primary/20 text-primary-ink hover:bg-primary/10'
                            )}
                          >
                            {u.bloqueado ? (
                              <>
                                <LockOpen size={12} aria-hidden="true" />
                                Desbloquear
                              </>
                            ) : (
                              <>
                                <Lock size={12} aria-hidden="true" />
                                Bloquear
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hayFiltros && status === 'ready' && usuarios.length > 0 && (
        <p className="mt-sm text-xs text-ink-mute">
          {usuarios.length} resultado{usuarios.length === 1 ? '' : 's'} encontrado{usuarios.length === 1 ? '' : 's'}.
        </p>
      )}

      {/* Modales */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editing && (
        <EditUserModal
          usuario={editing}
          onClose={() => setEditing(null)}
          onUpdated={handleUpdated}
        />
      )}
      {pending && (
        <ConfirmBloqueo
          usuario={pending.usuario}
          next={pending.next}
          isProcessing={isProcessing}
          onCancel={() => setPending(null)}
          onConfirm={confirmBloqueo}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-xl right-xl z-[60] flex items-center gap-sm rounded-sm border bg-canvas px-md py-sm',
            toast.type === 'success' ? 'border-primary/30' : 'border-retail-red/30'
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              toast.type === 'success' ? 'bg-primary' : 'bg-retail-red'
            )}
            aria-hidden="true"
          />
          <p className="text-xs font-medium text-ink">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
