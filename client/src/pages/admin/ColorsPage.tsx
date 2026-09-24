import React, { useCallback, useEffect, useState } from 'react';
import { Palette, Pencil, Plus, Power, PowerOff, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import type { ColorItem, CrearColorPayload, ActualizarColorPayload } from '../../types/color.types';

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const labelClass = 'block text-xs font-medium text-ink mb-xs';

const ESTADO_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
];

function Swatch({ hex }: { hex: string }): React.ReactElement {
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 rounded-full border border-hairline"
      style={{ backgroundColor: hex }}
      aria-hidden="true"
    />
  );
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

// ─── Modal de creación / edición ──────────────────────────────────────────────

interface ColorModalProps {
  color: ColorItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function ColorModal({ color, onClose, onSaved }: ColorModalProps): React.ReactElement {
  const editing = color !== null;
  const [nombre, setNombre] = useState(color?.nombre ?? '');
  const [hex, setHex] = useState(color?.hex ?? '#000000');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hexValido = HEX_REGEX.test(hex);
  const puedeGuardar = nombre.trim().length >= 2 && hexValido;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setServerError(null);
    if (!puedeGuardar) return;

    setIsSubmitting(true);
    try {
      if (editing && color) {
        const payload: ActualizarColorPayload = { nombre: nombre.trim(), hex: hex.toUpperCase() };
        const json = await apiClient.patch<ColorItem>(`/api/v1/colors/${color.id}`, payload);
        if (!json.success) {
          setServerError(json.error.message);
          return;
        }
        onSaved(`Color ${json.data.nombre} actualizado`);
      } else {
        const payload: CrearColorPayload = { nombre: nombre.trim(), hex: hex.toUpperCase() };
        const json = await apiClient.post<ColorItem>('/api/v1/colors', payload);
        if (!json.success) {
          setServerError(json.error.message);
          return;
        }
        onSaved(`Color ${json.data.nombre} creado`);
      }
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="color-modal-titulo" panelClassName="max-w-md">
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Palette size={16} className="text-primary-ink" aria-hidden="true" />
          <h2 id="color-modal-titulo" className="text-sm font-medium text-ink">
            {editing ? 'Editar color' : 'Nuevo color'}
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
          className="mb-md rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        <div>
          <label htmlFor="color-nombre" className={labelClass}>
            Nombre
          </label>
          <Input
            id="color-nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Negro"
          />
        </div>

        <div>
          <label htmlFor="color-hex" className={labelClass}>
            Hex
          </label>
          <div className="flex items-center gap-sm">
            <span
              className="h-9 w-9 shrink-0 rounded-sm border border-hairline"
              style={{ backgroundColor: hexValido ? hex : 'transparent' }}
              aria-hidden="true"
            />
            <Input
              id="color-hex"
              value={hex}
              onChange={e => setHex(e.target.value.toUpperCase())}
              placeholder="#000000"
              maxLength={7}
              invalid={!hexValido}
              className="font-mono uppercase"
            />
          </div>
          {!hexValido && (
            <p role="alert" aria-live="polite" className="mt-xs text-xs text-retail-red">
              Formato inválido. Usa #RRGGBB (ej. #FF0000).
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!puedeGuardar}>
            {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear color'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function ColorsPage(): React.ReactElement {
  const [colores, setColores] = useState<ColorItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'' | 'activo' | 'inactivo'>('');

  const [modal, setModal] = useState<{ color: ColorItem | null } | null>(null);
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
      .get<ColorItem[]>(`/api/v1/colors${qs ? `?${qs}` : ''}`)
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setColores(json.data);
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

  const handleSaved = useCallback(
    (message: string): void => {
      setModal(null);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const toggleActivo = useCallback(
    async (color: ColorItem): Promise<void> => {
      setTogglingId(color.id);
      try {
        const json = await apiClient.patch<ColorItem>(`/api/v1/colors/${color.id}`, {
          activo: !color.activo,
        });
        if (!json.success) {
          setToast({ type: 'error', message: json.error.message });
        } else {
          setToast({
            type: 'success',
            message: color.activo ? 'Color desactivado' : 'Color activado',
          });
          reload();
        }
      } catch (error) {
        setToast({
          type: 'error',
          message: error instanceof ApiClientError ? error.message : 'Error al actualizar el color',
        });
      } finally {
        setTogglingId(null);
      }
    },
    [reload]
  );

  const hayFiltros = Boolean(debouncedSearch || estadoFilter);

  return (
    <div>
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="text-heading-lg font-medium text-ink">Colores</h1>
          <p className="mt-xs text-sm text-ink-mute">
            Catálogo de colores con su hex para los swatches del Storefront.
          </p>
        </div>
        <Button type="button" onClick={() => setModal({ color: null })}>
          <Plus size={15} aria-hidden="true" />
          Nuevo color
        </Button>
      </div>

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
            aria-label="Buscar color"
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

      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        {status === 'loading' && (
          <div className="space-y-2 p-lg" aria-busy="true" aria-label="Cargando colores">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-xs bg-hairline-cool" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
            <p className="text-sm font-medium text-ink">No se pudieron cargar los colores</p>
            <Button type="button" variant="secondary" size="sm" onClick={reload}>
              Reintentar
            </Button>
          </div>
        )}

        {status === 'ready' && colores.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
            <Palette size={18} className="text-ink-faint" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">
              {hayFiltros ? 'Sin resultados' : 'Sin colores'}
            </p>
            <p className="max-w-xs text-xs text-ink-mute">
              {hayFiltros
                ? 'Ningún color coincide con la búsqueda o el filtro.'
                : 'Registra colores para usarlos como swatch en la tienda.'}
            </p>
          </div>
        )}

        {status === 'ready' && colores.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft">
                  <th className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                    Color
                  </th>
                  <th className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                    Hex
                  </th>
                  <th className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                    Estado
                  </th>
                  <th className="px-3 py-2.5 text-right font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-cool">
                {colores.map(c => (
                  <tr key={c.id} className="transition-colors duration-150 hover:bg-canvas-soft">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-sm">
                        <Swatch hex={c.hex} />
                        <span className="text-sm text-ink">{c.nombre}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-secondary">{c.hex}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-xs rounded-xs border px-xs py-xxs text-xs leading-none',
                          c.activo
                            ? 'border-primary/20 bg-primary/10 text-primary-ink'
                            : 'border-hairline-strong bg-canvas-soft text-ink-mute'
                        )}
                      >
                        <span
                          className={cn('h-1.5 w-1.5 rounded-full', c.activo ? 'bg-primary' : 'bg-ink-faint')}
                          aria-hidden="true"
                        />
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-xs">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setModal({ color: c })}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <ColorModal color={modal.color} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}

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

export default ColorsPage;
