import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ApiClientError } from '../../lib/apiClient';
import { atributosApi } from '../../lib/atributosApi';
import type {
  AtributoItem,
  AtributoValorItem,
  CrearAtributoPayload,
  TipoAtributo,
} from '../../types/atributo.types';

const labelClass = 'block text-xs font-medium text-ink mb-xs';
const TIPO_OPTIONS: SelectOption[] = [
  { value: 'TEXTO', label: 'Texto (M, XL, 128 GB)' },
  { value: 'COLOR', label: 'Color (hex)' },
  { value: 'NUMERO', label: 'Número (medida)' },
  { value: 'BOOLEANO', label: 'Booleano (Sí/No)' },
];

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

// ─── Modal de atributo ────────────────────────────────────────────────────────

function AtributoModal({
  atributo,
  onClose,
  onSaved,
}: {
  atributo: AtributoItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}): React.ReactElement {
  const editing = atributo !== null;
  const [nombre, setNombre] = useState(atributo?.nombre ?? '');
  const [codigo, setCodigo] = useState(atributo?.codigo ?? '');
  const [tipo, setTipo] = useState<TipoAtributo>(atributo?.tipo ?? 'TEXTO');
  const [unidad, setUnidad] = useState(atributo?.unidad ?? '');
  const [esVariante, setEsVariante] = useState(atributo?.es_variante ?? true);
  const [activo, setActivo] = useState(atributo?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (nombre.trim().length < 2) return;
    setIsSubmitting(true);
    try {
      if (editing && atributo) {
        const json = await atributosApi.actualizar(atributo.id, {
          nombre: nombre.trim(),
          tipo,
          unidad: tipo === 'NUMERO' ? unidad.trim() || null : null,
          es_variante: esVariante,
          activo,
        });
        if (!json.success) {
          setError(json.error.message);
          return;
        }
        onSaved(`Atributo "${json.data.nombre}" actualizado`);
      } else {
        const payload: CrearAtributoPayload = {
          nombre: nombre.trim(),
          tipo,
          unidad: tipo === 'NUMERO' ? unidad.trim() || null : null,
          es_variante: esVariante,
          activo,
        };
        if (codigo.trim()) payload.codigo = codigo.trim().toUpperCase();
        const json = await atributosApi.crear(payload);
        if (!json.success) {
          setError(json.error.message);
          return;
        }
        onSaved(`Atributo "${json.data.nombre}" creado`);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="atributo-modal-titulo" panelClassName="max-w-md">
      <div className="mb-lg flex items-center justify-between">
        <h2 id="atributo-modal-titulo" className="text-sm font-medium text-ink">
          {editing ? 'Editar atributo' : 'Nuevo atributo'}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mb-md rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        <div>
          <label htmlFor="atr-nombre" className={labelClass}>Nombre</label>
          <Input id="atr-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Talla Calzado" />
        </div>

        {!editing && (
          <div>
            <label htmlFor="atr-codigo" className={labelClass}>Código (opcional)</label>
            <Input id="atr-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="TALLA_CALZADO" className="font-mono uppercase" />
            <p className="mt-xs text-xs text-ink-mute">Si lo dejas vacío, se genera del nombre.</p>
          </div>
        )}

        <div>
          <label htmlFor="atr-tipo" className={labelClass}>Tipo de valor</label>
          <Select id="atr-tipo" value={tipo} onChange={(v) => setTipo(v as TipoAtributo)} options={TIPO_OPTIONS} aria-label="Tipo de atributo" />
        </div>

        {tipo === 'NUMERO' && (
          <div>
            <label htmlFor="atr-unidad" className={labelClass}>Unidad (opcional)</label>
            <Input id="atr-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="cm / GB / ml" />
          </div>
        )}

        <label className="flex items-center gap-sm text-sm text-ink">
          <input type="checkbox" checked={esVariante} onChange={(e) => setEsVariante(e.target.checked)} className="h-4 w-4 accent-primary" />
          Es atributo de variante
        </label>
        <label className="flex items-center gap-sm text-sm text-ink">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4 accent-primary" />
          Activo
        </label>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting} disabled={nombre.trim().length < 2}>
            {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear atributo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal de valor ───────────────────────────────────────────────────────────

function ValorModal({
  atributo,
  valor,
  onClose,
  onSaved,
}: {
  atributo: AtributoItem;
  valor: AtributoValorItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}): React.ReactElement {
  const editing = valor !== null;
  const [nombre, setNombre] = useState(valor?.valor ?? '');
  const [hex, setHex] = useState(valor?.hex ?? '#000000');
  const [activo, setActivo] = useState(valor?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const esColor = atributo.tipo === 'COLOR';
  const hexValido = !esColor || /^#[0-9a-fA-F]{6}$/.test(hex);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (nombre.trim().length < 1 || !hexValido) return;
    setIsSubmitting(true);
    try {
      const json = editing && valor
        ? await atributosApi.actualizarValor(valor.id, {
            valor: nombre.trim(),
            hex: esColor ? hex.toUpperCase() : null,
            activo,
          })
        : await atributosApi.crearValor(atributo.id, {
            valor: nombre.trim(),
            hex: esColor ? hex.toUpperCase() : null,
            activo,
          });
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      onSaved(`Valor "${nombre.trim()}" ${editing ? 'actualizado' : 'creado'}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="valor-modal-titulo" panelClassName="max-w-sm">
      <div className="mb-lg flex items-center justify-between">
        <h2 id="valor-modal-titulo" className="text-sm font-medium text-ink">
          {editing ? 'Editar valor' : 'Nuevo valor'} · {atributo.nombre}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mb-md rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        <div>
          <label htmlFor="valor-nombre" className={labelClass}>Valor</label>
          <Input id="valor-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Azul Marino" />
        </div>

        {esColor && (
          <div>
            <label htmlFor="valor-hex" className={labelClass}>Hex</label>
            <div className="flex items-center gap-sm">
              <span className="h-9 w-9 shrink-0 rounded-sm border border-hairline" style={{ backgroundColor: hexValido ? hex : 'transparent' }} aria-hidden="true" />
              <Input id="valor-hex" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} maxLength={7} invalid={!hexValido} className="font-mono uppercase" />
            </div>
          </div>
        )}

        <label className="flex items-center gap-sm text-sm text-ink">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4 accent-primary" />
          Activo
        </label>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting} disabled={nombre.trim().length < 1 || !hexValido}>
            {isSubmitting ? 'Guardando…' : editing ? 'Guardar' : 'Agregar valor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function AttributesPage(): React.ReactElement {
  const [atributos, setAtributos] = useState<AtributoItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [modalAtributo, setModalAtributo] = useState<{ atributo: AtributoItem | null } | null>(null);
  const [modalValor, setModalValor] = useState<{ atributo: AtributoItem; valor: AtributoValorItem | null } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let activo = true;
    setStatus('loading');
    atributosApi
      .listar()
      .then((json) => {
        if (!activo) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setAtributos(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (activo) setStatus('error');
      });
    return () => {
      activo = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const eliminarAtributo = useCallback(
    async (atributo: AtributoItem): Promise<void> => {
      try {
        const json = await atributosApi.eliminar(atributo.id);
        if (!json.success) setToast({ type: 'error', message: json.error.message });
        else {
          setToast({ type: 'success', message: 'Atributo eliminado' });
          reload();
        }
      } catch (err) {
        setToast({ type: 'error', message: err instanceof ApiClientError ? err.message : 'Error al eliminar' });
      }
    },
    [reload]
  );

  const eliminarValor = useCallback(
    async (valor: AtributoValorItem): Promise<void> => {
      try {
        const json = await atributosApi.eliminarValor(valor.id);
        if (!json.success) setToast({ type: 'error', message: json.error.message });
        else {
          setToast({ type: 'success', message: 'Valor eliminado' });
          reload();
        }
      } catch (err) {
        setToast({ type: 'error', message: err instanceof ApiClientError ? err.message : 'Error al eliminar' });
      }
    },
    [reload]
  );

  return (
    <div>
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="text-heading-lg font-medium text-ink">Atributos</h1>
          <p className="mt-xs text-sm text-ink-mute">
            Maestro global de propiedades (Color, Talla, Almacenamiento…) y sus valores.
          </p>
        </div>
        <Button type="button" onClick={() => setModalAtributo({ atributo: null })}>
          <Plus size={15} aria-hidden="true" />
          Nuevo atributo
        </Button>
      </div>

      {status === 'loading' && (
        <div className="space-y-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-sm border border-hairline bg-hairline-cool/40" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-md rounded-sm border border-hairline bg-canvas px-lg py-huge text-center">
          <p className="text-sm font-medium text-ink">No se pudieron cargar los atributos</p>
          <Button type="button" variant="secondary" size="sm" onClick={reload}>Reintentar</Button>
        </div>
      )}

      {status === 'ready' && atributos.length === 0 && (
        <div className="flex flex-col items-center gap-md rounded-sm border border-hairline bg-canvas px-lg py-huge text-center">
          <Tag size={18} className="text-ink-faint" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">Sin atributos</p>
          <p className="max-w-xs text-xs text-ink-mute">Crea el primer atributo (ej. Color) y sus valores.</p>
          <Button type="button" size="sm" onClick={() => setModalAtributo({ atributo: null })}>
            <Plus size={13} aria-hidden="true" /> Nuevo atributo
          </Button>
        </div>
      )}

      {status === 'ready' && atributos.length > 0 && (
        <div className="space-y-md">
          {atributos.map((atributo) => (
            <section key={atributo.id} className="overflow-hidden rounded-sm border border-hairline bg-canvas">
              <header className="flex flex-wrap items-center justify-between gap-sm border-b border-hairline bg-canvas-soft px-md py-sm">
                <div className="flex items-center gap-sm">
                  <span className="text-sm font-medium text-ink">{atributo.nombre}</span>
                  <span className="rounded-xs border border-hairline bg-canvas px-xs py-xxs font-mono text-xs text-ink-mute">{atributo.codigo}</span>
                  <span className="rounded-xs border border-hairline bg-canvas px-xs py-xxs text-xs text-ink-mute">{atributo.tipo}</span>
                  {!atributo.activo && <span className="text-xs text-ink-faint">• inactivo</span>}
                </div>
                <div className="flex items-center gap-xs">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setModalValor({ atributo, valor: null })}>
                    <Plus size={12} aria-hidden="true" /> Valor
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setModalAtributo({ atributo })}>
                    <Pencil size={12} aria-hidden="true" /> Editar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => eliminarAtributo(atributo)}
                    className="text-retail-red hover:bg-retail-red/10"
                  >
                    <Trash2 size={12} aria-hidden="true" /> Eliminar
                  </Button>
                </div>
              </header>

              {atributo.valores.length === 0 ? (
                <p className="px-md py-md text-xs text-ink-mute">Sin valores. Agrega el primero con “+ Valor”.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="px-md py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Valor</th>
                        <th className="px-md py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Uso</th>
                        <th className="px-md py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Estado</th>
                        <th className="px-md py-2.5 text-right font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline-cool">
                      {atributo.valores.map((valor) => (
                        <tr key={valor.id} className="transition-colors duration-150 hover:bg-canvas-soft">
                          <td className="px-md py-2.5">
                            <div className="flex items-center gap-sm">
                              {atributo.tipo === 'COLOR' && valor.hex && (
                                <span className="h-4 w-4 shrink-0 rounded-full border border-hairline" style={{ backgroundColor: valor.hex }} aria-hidden="true" />
                              )}
                              <span className="text-sm text-ink">{valor.valor}</span>
                              {valor.hex && <span className="font-mono text-xs text-ink-mute">{valor.hex}</span>}
                            </div>
                          </td>
                          <td className="px-md py-2.5 font-mono text-xs tabular-nums text-ink-mute">{valor.usos}</td>
                          <td className="px-md py-2.5">
                            <span className={cn('text-xs', valor.activo ? 'text-primary-ink' : 'text-ink-faint')}>
                              {valor.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-md py-2.5">
                            <div className="flex items-center justify-end gap-xs">
                              <Button type="button" variant="secondary" size="sm" onClick={() => setModalValor({ atributo, valor })}>
                                <Pencil size={12} aria-hidden="true" /> Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => eliminarValor(valor)}
                                aria-label={`Eliminar valor ${valor.valor}`}
                                className="text-ink-mute hover:bg-retail-red/8 hover:text-retail-red"
                              >
                                <Trash2 size={13} aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {modalAtributo && (
        <AtributoModal
          atributo={modalAtributo.atributo}
          onClose={() => setModalAtributo(null)}
          onSaved={(message) => {
            setModalAtributo(null);
            setToast({ type: 'success', message });
            reload();
          }}
        />
      )}

      {modalValor && (
        <ValorModal
          atributo={modalValor.atributo}
          valor={modalValor.valor}
          onClose={() => setModalValor(null)}
          onSaved={(message) => {
            setModalValor(null);
            setToast({ type: 'success', message });
            reload();
          }}
        />
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
          <span className={cn('h-2 w-2 rounded-full', toast.type === 'success' ? 'bg-primary' : 'bg-retail-red')} aria-hidden="true" />
          <p className="text-xs font-medium text-ink">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default AttributesPage;
