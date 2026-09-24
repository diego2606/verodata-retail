import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { slugify } from '../../lib/slugify';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import type {
  ActualizarCategoriaPayload,
  CategoriaItem,
  CrearCategoriaPayload,
} from '../../types/category.types';

// ─── Schema del formulario ────────────────────────────────────────────────────

const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100),
  slug: z.string().trim().max(120).optional().or(z.literal('')),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

const ESTADO_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activas' },
  { value: 'inactivo', label: 'Inactivas' },
];

// ─── Presentación ─────────────────────────────────────────────────────────────

function EstadoBadge({ activo }: { activo: boolean }): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-xs border px-xs py-xxs text-xs leading-none',
        activo
          ? 'border-primary/20 bg-primary/10 text-primary-ink'
          : 'border-hairline-strong bg-canvas-soft text-ink-mute'
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', activo ? 'bg-primary' : 'bg-ink-faint')}
        aria-hidden="true"
      />
      {activo ? 'Activa' : 'Inactiva'}
    </span>
  );
}

const COLUMNS = ['Nombre', 'Slug', 'Productos', 'Estado'] as const;

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
    <div className="overflow-x-auto" aria-busy="true" aria-label="Cargando categorías">
      <table className="w-full border-collapse">
        <TableHeader />
        <tbody className="divide-y divide-hairline-cool">
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5"><div className="h-3 w-40 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-32 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-8 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-4 w-16 rounded-xs bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="ml-auto h-5 w-32 rounded-xs bg-hairline-cool animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  filtered,
  onCreate,
  onClear,
}: {
  filtered: boolean;
  onCreate: () => void;
  onClear: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-hairline bg-canvas-soft" aria-hidden="true">
        <Tag size={18} className="text-ink-faint" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">
          {filtered ? 'Sin resultados' : 'Sin categorías'}
        </p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          {filtered
            ? 'Ninguna categoría coincide con la búsqueda o los filtros aplicados.'
            : 'Crea la primera categoría para organizar el catálogo.'}
        </p>
      </div>
      {filtered ? (
        <Button type="button" variant="secondary" size="sm" onClick={onClear}>
          Limpiar filtros
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus size={13} aria-hidden="true" />
          Nueva categoría
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
        <p className="text-sm font-medium text-ink">No se pudieron cargar las categorías</p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          Ocurrió un error al consultar el catálogo. Vuelve a intentarlo.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

// ─── Modal de creación / edición ──────────────────────────────────────────────

interface CategoryModalProps {
  categoria: CategoriaItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
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

function CategoryModal({ categoria, onClose, onSaved }: CategoryModalProps): React.ReactElement {
  const editing = categoria !== null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(editing);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria?.nombre ?? '',
      slug: categoria?.slug ?? '',
      descripcion: categoria?.descripcion ?? '',
    },
  });

  const nombreValue = watch('nombre');

  // Auto-genera el slug desde el nombre mientras no se edite manualmente (CA02)
  useEffect(() => {
    if (!slugTouched) setValue('slug', slugify(nombreValue ?? ''));
  }, [nombreValue, slugTouched, setValue]);

  const onSubmit = async (values: CategoriaFormValues): Promise<void> => {
    setServerError(null);
    const slug = values.slug ? values.slug : undefined;

    try {
      if (editing && categoria) {
        const payload: ActualizarCategoriaPayload = {
          nombre: values.nombre,
          slug,
          descripcion: values.descripcion ?? '',
        };
        const json = await apiClient.patch<CategoriaItem>(
          `/api/v1/categories/${categoria.id}`,
          payload
        );
        if (!json.success) {
          setServerError(json.error.message);
          return;
        }
        onSaved(`Categoría ${json.data.nombre} actualizada`);
      } else {
        const payload: CrearCategoriaPayload = {
          nombre: values.nombre,
          slug,
          descripcion: values.descripcion || undefined,
        };
        const json = await apiClient.post<CategoriaItem>('/api/v1/categories', payload);
        if (!json.success) {
          setServerError(json.error.message);
          return;
        }
        onSaved(`Categoría ${json.data.nombre} creada`);
      }
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    }
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy="categoria-modal-titulo"
      panelClassName="max-w-md"
    >
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Tag size={16} className="text-primary-ink" aria-hidden="true" />
          <h2 id="categoria-modal-titulo" className="text-sm font-medium text-ink">
            {editing ? 'Editar categoría' : 'Nueva categoría'}
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
        <div>
          <label htmlFor="nombre" className={labelClass}>
            Nombre
          </label>
          <Input id="nombre" invalid={!!errors.nombre} placeholder="Calzado deportivo" {...register('nombre')} />
          <FieldError message={errors.nombre?.message} />
        </div>

        <div>
          <label htmlFor="slug" className={labelClass}>
            Slug <span className="text-ink-faint">(URL)</span>
          </label>
          <Input
            id="slug"
            invalid={!!errors.slug}
            placeholder="calzado-deportivo"
            className="font-mono"
            {...register('slug', { onChange: () => setSlugTouched(true) })}
          />
          <p className="mt-xs text-xs text-ink-mute">
            Se genera automáticamente desde el nombre; puedes editarlo.
          </p>
          <FieldError message={errors.slug?.message} />
        </div>

        <div>
          <label htmlFor="descripcion" className={labelClass}>
            Descripción <span className="text-ink-faint">(opcional)</span>
          </label>
          <Textarea
            id="descripcion"
            invalid={!!errors.descripcion}
            placeholder="Breve descripción de la categoría…"
            {...register('descripcion')}
          />
          <FieldError message={errors.descripcion?.message} />
        </div>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Confirmación de eliminación ──────────────────────────────────────────────

function ConfirmDelete({
  categoria,
  isProcessing,
  onCancel,
  onConfirm,
}: {
  categoria: CategoriaItem;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.ReactElement {
  return (
    <Modal onClose={onCancel} labelledBy="confirmar-eliminar-titulo" panelClassName="max-w-sm">
      <div className="mb-md flex items-center gap-sm">
        <Trash2 size={16} className="text-retail-red" aria-hidden="true" />
        <h2 id="confirmar-eliminar-titulo" className="text-sm font-medium text-ink">
          Eliminar categoría
        </h2>
      </div>
      <p className="text-xs leading-relaxed text-ink-mute">
        Esta acción es permanente. Si la categoría tuviera productos asociados, el sistema la
        bloqueará y deberás desactivarla en su lugar.
      </p>
      <p className="mt-sm rounded-xs border border-hairline-cool bg-canvas-soft px-sm py-xs font-mono text-xs text-ink">
        {categoria.nombre}
      </p>
      <div className="mt-lg flex items-center justify-end gap-sm">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button type="button" variant="danger" isLoading={isProcessing} onClick={onConfirm}>
          {isProcessing ? 'Eliminando…' : 'Eliminar'}
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

export function CategoriesPage(): React.ReactElement {
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'' | 'activo' | 'inactivo'>('');

  const [modal, setModal] = useState<{ categoria: CategoriaItem | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CategoriaItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (estadoFilter) params.set('activo', estadoFilter === 'activo' ? 'true' : 'false');
    const qs = params.toString();

    apiClient
      .get<CategoriaItem[]>(`/api/v1/categories${qs ? `?${qs}` : ''}`)
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setCategorias(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, estadoFilter, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const reload = useCallback((): void => setReloadKey(k => k + 1), []);

  const clearFilters = useCallback((): void => {
    setSearch('');
    setEstadoFilter('');
  }, []);

  const handleSaved = useCallback(
    (message: string): void => {
      setModal(null);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const toggleActivo = useCallback(
    async (categoria: CategoriaItem): Promise<void> => {
      setTogglingId(categoria.id);
      try {
        const json = await apiClient.patch<CategoriaItem>(
          `/api/v1/categories/${categoria.id}`,
          { activo: !categoria.activo }
        );
        if (!json.success) {
          setToast({ type: 'error', message: json.error.message });
        } else {
          setToast({
            type: 'success',
            message: categoria.activo ? 'Categoría desactivada' : 'Categoría activada',
          });
          reload();
        }
      } catch (error) {
        setToast({
          type: 'error',
          message: error instanceof ApiClientError ? error.message : 'Error al actualizar la categoría',
        });
      } finally {
        setTogglingId(null);
      }
    },
    [reload]
  );

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      const json = await apiClient.delete<{ id: number }>(`/api/v1/categories/${pendingDelete.id}`);
      if (!json.success) {
        setToast({ type: 'error', message: json.error.message });
      } else {
        setToast({ type: 'success', message: 'Categoría eliminada' });
        reload();
      }
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof ApiClientError ? error.message : 'Error al eliminar la categoría',
      });
    } finally {
      setIsProcessing(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, reload]);

  const hayFiltros = useMemo(
    () => Boolean(debouncedSearch || estadoFilter),
    [debouncedSearch, estadoFilter]
  );

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="text-heading-lg font-medium text-ink">Categorías</h1>
          <p className="mt-xs text-sm text-ink-mute">
            Organiza el catálogo de productos de forma jerárquica.
          </p>
        </div>
        <Button type="button" onClick={() => setModal({ categoria: null })}>
          <Plus size={15} aria-hidden="true" />
          Nueva categoría
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
            placeholder="Buscar por nombre o slug…"
            aria-label="Buscar categoría por nombre o slug"
            className="pl-xl"
          />
        </div>
        <Select
          value={estadoFilter}
          onChange={value => setEstadoFilter(value as '' | 'activo' | 'inactivo')}
          options={ESTADO_FILTER_OPTIONS}
          aria-label="Filtrar por estado"
          containerClassName="relative min-w-[160px]"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        {status === 'loading' && <TableSkeleton />}
        {status === 'error' && <ErrorState onRetry={reload} />}
        {status === 'ready' && categorias.length === 0 && (
          <EmptyState
            filtered={hayFiltros}
            onCreate={() => setModal({ categoria: null })}
            onClear={clearFilters}
          />
        )}

        {status === 'ready' && categorias.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHeader />
              <tbody className="divide-y divide-hairline-cool">
                {categorias.map(c => (
                  <tr key={c.id} className="transition-colors duration-150 hover:bg-canvas-soft">
                    <td className="px-3 py-2.5 text-sm text-ink">{c.nombre}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-secondary">{c.slug}</td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-ink-mute">
                      {c.productos_count}
                    </td>
                    <td className="px-3 py-2.5">
                      <EstadoBadge activo={c.activo} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-xs">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setModal({ categoria: c })}
                        >
                          <Pencil size={12} aria-hidden="true" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          isLoading={togglingId === c.id}
                          onClick={() => toggleActivo(c)}
                        >
                          {c.activo ? (
                            <>
                              <PowerOff size={12} aria-hidden="true" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <Power size={12} aria-hidden="true" />
                              Activar
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={c.productos_count > 0}
                          title={
                            c.productos_count > 0
                              ? 'No se puede eliminar: tiene productos asociados. Desactívala.'
                              : undefined
                          }
                          onClick={() => setPendingDelete(c)}
                          className="text-retail-red hover:bg-retail-red/10"
                        >
                          <Trash2 size={12} aria-hidden="true" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hayFiltros && status === 'ready' && categorias.length > 0 && (
        <p className="mt-sm text-xs text-ink-mute">
          {categorias.length} resultado{categorias.length === 1 ? '' : 's'} encontrado{categorias.length === 1 ? '' : 's'}.
        </p>
      )}

      {/* Modales */}
      {modal && (
        <CategoryModal
          categoria={modal.categoria}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {pendingDelete && (
        <ConfirmDelete
          categoria={pendingDelete}
          isProcessing={isProcessing}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
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

export default CategoriesPage;
