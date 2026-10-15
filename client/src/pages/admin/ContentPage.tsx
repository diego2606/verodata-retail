import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Image as ImageIcon,
  LayoutTemplate,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ApiClientError } from '../../lib/apiClient';
import { bannersApi, siteConfigApi } from '../../lib/banners';
import type {
  BannerItem,
  BannerUbicacion,
  CrearBannerPayload,
  FranjaConfianza,
  SiteConfigItem,
} from '../../types/banner.types';
import { FRANJA_DEFECTO, leerFranja } from '../../lib/portada';

// ─── Constantes ───────────────────────────────────────────────────────────────

type TabKey = BannerUbicacion | 'CONFIANZA';

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'HERO', label: 'Hero' },
  { key: 'TICKER', label: 'Cintillo' },
  { key: 'BANDA_EDITORIAL', label: 'Banda editorial' },
  { key: 'CONFIANZA', label: 'Confianza' },
];

const labelClass = 'block text-xs font-medium text-ink mb-xs';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

// ─── Utilidades de fecha ──────────────────────────────────────────────────────

function aInputDatetime(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  const offset = fecha.getTimezoneOffset();
  return new Date(fecha.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function aIso(valor: string): string | null {
  return valor ? new Date(valor).toISOString() : null;
}

function formatearVigencia(banner: BannerItem): string {
  if (!banner.vigente_desde && !banner.vigente_hasta) return 'Siempre';
  const desde = banner.vigente_desde ? new Date(banner.vigente_desde).toLocaleDateString('es-PE') : '—';
  const hasta = banner.vigente_hasta ? new Date(banner.vigente_hasta).toLocaleDateString('es-PE') : '—';
  return `${desde} → ${hasta}`;
}

// ─── Modal de banner ──────────────────────────────────────────────────────────

interface BannerModalProps {
  ubicacion: BannerUbicacion;
  banner: BannerItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function BannerModal({ ubicacion, banner, onClose, onSaved }: BannerModalProps): React.ReactElement {
  const editing = banner !== null;
  const [titulo, setTitulo] = useState(banner?.titulo ?? '');
  const [etiqueta, setEtiqueta] = useState(banner?.etiqueta ?? '');
  const [subtitulo, setSubtitulo] = useState(banner?.subtitulo ?? '');
  const [ctaTexto, setCtaTexto] = useState(banner?.cta_texto ?? '');
  const [ctaUrl, setCtaUrl] = useState(banner?.cta_url ?? '');
  const [imagenUrl, setImagenUrl] = useState(banner?.imagen_url ?? '');
  const [activo, setActivo] = useState(banner?.activo ?? true);
  const [vigenteDesde, setVigenteDesde] = useState(aInputDatetime(banner?.vigente_desde ?? null));
  const [vigenteHasta, setVigenteHasta] = useState(aInputDatetime(banner?.vigente_hasta ?? null));
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const puedeGuardar = titulo.trim().length >= 1 && imagenUrl.trim().length >= 1;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setServerError(null);
    if (!puedeGuardar) return;
    setIsSubmitting(true);

    const payload: CrearBannerPayload = {
      ubicacion,
      titulo: titulo.trim(),
      etiqueta: etiqueta.trim() || null,
      subtitulo: subtitulo.trim() || null,
      cta_texto: ctaTexto.trim() || null,
      cta_url: ctaUrl.trim() || null,
      imagen_url: imagenUrl.trim(),
      activo,
      vigente_desde: aIso(vigenteDesde),
      vigente_hasta: aIso(vigenteHasta),
    };

    try {
      const json =
        editing && banner
          ? await bannersApi.actualizar(banner.id, payload)
          : await bannersApi.crear(payload);
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onSaved();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="banner-modal-titulo" panelClassName="max-w-xl">
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <LayoutTemplate size={16} className="text-primary-ink" aria-hidden="true" />
          <h2 id="banner-modal-titulo" className="text-sm font-medium text-ink">
            {editing ? 'Editar banner' : 'Nuevo banner'}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {serverError && (
        <div role="alert" aria-live="polite" className="mb-md rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary">
          {serverError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        <div>
          <label htmlFor="banner-titulo" className={labelClass}>Título</label>
          <Input id="banner-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nueva temporada" />
        </div>

        {ubicacion !== 'TICKER' && (
          <div>
            <label htmlFor="banner-etiqueta" className={labelClass}>Sobre-título (opcional)</label>
            <Input
              id="banner-etiqueta"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="Temporada"
            />
            <p className="mt-xs text-xs text-ink-mute">
              Línea pequeña que se muestra encima del título. Máximo 80 caracteres.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="banner-subtitulo" className={labelClass}>Subtítulo (opcional)</label>
          <Input id="banner-subtitulo" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} placeholder="Equípate para el día a día" />
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="banner-cta-texto" className={labelClass}>Texto del botón</label>
            <Input id="banner-cta-texto" value={ctaTexto} onChange={(e) => setCtaTexto(e.target.value)} placeholder="Ver todo" />
          </div>
          <div>
            <label htmlFor="banner-cta-url" className={labelClass}>Enlace del botón</label>
            <Input id="banner-cta-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/catalogo" />
          </div>
        </div>

        <div>
          <label htmlFor="banner-imagen" className={labelClass}>URL de la imagen</label>
          <Input id="banner-imagen" value={imagenUrl} onChange={(e) => setImagenUrl(e.target.value)} placeholder="https://…" />
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="banner-desde" className={labelClass}>Vigente desde</label>
            <Input id="banner-desde" type="datetime-local" value={vigenteDesde} onChange={(e) => setVigenteDesde(e.target.value)} />
          </div>
          <div>
            <label htmlFor="banner-hasta" className={labelClass}>Vigente hasta</label>
            <Input id="banner-hasta" type="datetime-local" value={vigenteHasta} onChange={(e) => setVigenteHasta(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-sm text-sm text-ink">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4 accent-primary" />
          Activo
        </label>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!puedeGuardar}>
            {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear banner'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Pestaña de banners ───────────────────────────────────────────────────────

interface BannerTabProps {
  ubicacion: BannerUbicacion;
}

function BannerTab({ ubicacion }: BannerTabProps): React.ReactElement {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<{ banner: BannerItem | null } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let activo = true;
    setStatus('loading');
    bannersApi
      .listar(ubicacion)
      .then((json) => {
        if (!activo) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setBanners(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (activo) setStatus('error');
      });
    return () => {
      activo = false;
    };
  }, [ubicacion, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const reload = useCallback((): void => setReloadKey((k) => k + 1), []);

  const persistirOrden = useCallback(
    async (lista: BannerItem[]): Promise<void> => {
      const json = await bannersApi.reordenar(lista.map((b) => b.id));
      if (!json.success) {
        setToast({ type: 'error', message: json.error.message });
        setReloadKey((k) => k + 1);
      }
    },
    []
  );

  const mover = useCallback(
    (index: number, delta: number): void => {
      const destino = index + delta;
      if (destino < 0 || destino >= banners.length) return;
      const next = [...banners];
      const temporal = next[index];
      next[index] = next[destino];
      next[destino] = temporal;
      setBanners(next);
      void persistirOrden(next);
    },
    [banners, persistirOrden]
  );

  const soltarEn = useCallback(
    (target: number): void => {
      if (dragIndex === null || dragIndex === target) return;
      const next = [...banners];
      const [movido] = next.splice(dragIndex, 1);
      next.splice(target, 0, movido);
      setBanners(next);
      setDragIndex(null);
      void persistirOrden(next);
    },
    [banners, dragIndex, persistirOrden]
  );

  const toggleActivo = useCallback(
    async (banner: BannerItem): Promise<void> => {
      setTogglingId(banner.id);
      try {
        const json = await bannersApi.actualizar(banner.id, { activo: !banner.activo });
        if (!json.success) setToast({ type: 'error', message: json.error.message });
        else {
          setToast({ type: 'success', message: banner.activo ? 'Banner desactivado' : 'Banner activado' });
          reload();
        }
      } catch (error) {
        setToast({ type: 'error', message: error instanceof ApiClientError ? error.message : 'Error al actualizar' });
      } finally {
        setTogglingId(null);
      }
    },
    [reload]
  );

  const eliminar = useCallback(
    async (banner: BannerItem): Promise<void> => {
      try {
        const json = await bannersApi.eliminar(banner.id);
        if (!json.success) setToast({ type: 'error', message: json.error.message });
        else {
          setToast({ type: 'success', message: 'Banner eliminado' });
          reload();
        }
      } catch (error) {
        setToast({ type: 'error', message: error instanceof ApiClientError ? error.message : 'Error al eliminar' });
      }
    },
    [reload]
  );

  const primerActivo = banners.find((b) => b.activo) ?? banners[0] ?? null;

  return (
    <div>
      <div className="mb-md flex justify-end">
        <Button type="button" onClick={() => setModal({ banner: null })}>
          <Plus size={15} aria-hidden="true" />
          Nuevo banner
        </Button>
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        {status === 'loading' && (
          <div className="space-y-2 p-lg" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-xs bg-hairline-cool" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-md px-lg py-huge text-center">
            <p className="text-sm font-medium text-ink">No se pudieron cargar los banners</p>
            <Button type="button" variant="secondary" size="sm" onClick={reload}>Reintentar</Button>
          </div>
        )}

        {status === 'ready' && banners.length === 0 && (
          <div className="flex flex-col items-center gap-md px-lg py-huge text-center">
            <ImageIcon size={18} className="text-ink-faint" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">Aún no hay banners en esta sección</p>
            <p className="max-w-xs text-xs text-ink-mute">Crea el primero para mostrarlo en la portada.</p>
            <Button type="button" size="sm" onClick={() => setModal({ banner: null })}>
              <Plus size={14} aria-hidden="true" />
              Nuevo banner
            </Button>
          </div>
        )}

        {status === 'ready' && banners.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft">
                  <th className="w-8 px-2 py-2.5" aria-label="Orden" />
                  <th className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Imagen</th>
                  <th className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Título</th>
                  <th className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Vigencia</th>
                  <th className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Estado</th>
                  <th className="px-3 py-2.5 text-right font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-cool">
                {banners.map((banner, index) => (
                  <tr
                    key={banner.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => soltarEn(index)}
                    className={cn(
                      'transition-colors duration-150 hover:bg-canvas-soft',
                      dragIndex === index && 'bg-primary/5'
                    )}
                  >
                    <td className="cursor-move px-2 py-2.5 text-ink-faint" title="Arrastra para reordenar">
                      <GripVertical size={14} aria-hidden="true" />
                    </td>
                    <td className="px-3 py-2.5">
                      <img
                        src={banner.imagen_url}
                        alt=""
                        className="h-9 w-16 rounded-xs border border-hairline object-cover"
                        loading="lazy"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-sm text-ink">{banner.titulo}</p>
                      {banner.subtitulo && <p className="text-xs text-ink-mute">{banner.subtitulo}</p>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-secondary">{formatearVigencia(banner)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-xs rounded-xs border px-xs py-xxs text-xs leading-none',
                          banner.activo
                            ? 'border-primary/20 bg-primary/10 text-primary-ink'
                            : 'border-hairline-strong bg-canvas-soft text-ink-mute'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', banner.activo ? 'bg-primary' : 'bg-ink-faint')} aria-hidden="true" />
                        {banner.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-xs">
                        <Button type="button" variant="ghost" size="icon" onClick={() => mover(index, -1)} disabled={index === 0} aria-label="Subir">
                          <ArrowUp size={13} aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => mover(index, 1)} disabled={index === banners.length - 1} aria-label="Bajar">
                          <ArrowDown size={13} aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setModal({ banner })}>
                          <Pencil size={12} aria-hidden="true" />
                          Editar
                        </Button>
                        <Button type="button" variant="secondary" size="sm" isLoading={togglingId === banner.id} onClick={() => toggleActivo(banner)}>
                          {banner.activo ? <PowerOff size={12} aria-hidden="true" /> : <Power size={12} aria-hidden="true" />}
                          {banner.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminar(banner)}
                          aria-label={`Eliminar ${banner.titulo}`}
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
      </div>

      {/* Previsualización */}
      {primerActivo && (
        <div className="mt-lg">
          <p className="mb-xs font-mono text-xs uppercase tracking-widest text-ink-mute">Previsualización</p>
          <div className="relative overflow-hidden rounded-sm border border-hairline">
            <img src={primerActivo.imagen_url} alt="" className="h-40 w-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-end gap-xs bg-ink/50 p-lg text-white">
              <p className="text-lg font-medium">{primerActivo.titulo}</p>
              {primerActivo.subtitulo && <p className="text-sm text-white/80">{primerActivo.subtitulo}</p>}
              {primerActivo.cta_texto && (
                <span className="mt-xs w-fit rounded-sm bg-white px-md py-xs text-xs font-semibold text-ink">
                  {primerActivo.cta_texto}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <BannerModal
          ubicacion={ubicacion}
          banner={modal.banner}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setToast({ type: 'success', message: modal.banner ? 'Banner actualizado' : 'Banner creado' });
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

// ─── Pestaña de franja de confianza ───────────────────────────────────────────

function leerFranjaConfig(config: SiteConfigItem[]): FranjaConfianza[] {
  const items = leerFranja(config.find((c) => c.clave === 'franja_confianza')?.valor);
  return items.length > 0 ? items : FRANJA_DEFECTO;
}

function ConfianzaTab(): React.ReactElement {
  const [items, setItems] = useState<FranjaConfianza[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let activo = true;
    setStatus('loading');
    siteConfigApi
      .listar()
      .then((json) => {
        if (!activo) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setItems(leerFranjaConfig(json.data));
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

  const actualizarItem = (index: number, campo: keyof FranjaConfianza, valor: string): void => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  };

  const guardar = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const json = await siteConfigApi.actualizar('franja_confianza', items);
      if (!json.success) setToast({ type: 'error', message: json.error.message });
      else setToast({ type: 'success', message: 'Franja de confianza actualizada' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof ApiClientError ? error.message : 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return <div className="h-32 animate-pulse rounded-sm border border-hairline bg-hairline-cool/40" />;
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-md rounded-sm border border-hairline bg-canvas px-lg py-huge text-center">
        <p className="text-sm font-medium text-ink">No se pudo cargar la configuración</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-sm rounded-sm border border-hairline bg-canvas p-lg">
        {items.map((item, index) => (
          <div key={index} className="grid items-start gap-sm sm:grid-cols-[1fr_2fr_auto]">
            <Input value={item.titulo} onChange={(e) => actualizarItem(index, 'titulo', e.target.value)} placeholder="Título" aria-label={`Título del ítem ${index + 1}`} />
            <Input value={item.texto} onChange={(e) => actualizarItem(index, 'texto', e.target.value)} placeholder="Descripción" aria-label={`Descripción del ítem ${index + 1}`} />
            <Button type="button" variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} aria-label="Quitar ítem">
              <Trash2 size={14} aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setItems((prev) => [...prev, { titulo: '', texto: '' }])}>
          <Plus size={14} aria-hidden="true" />
          Agregar ítem
        </Button>
      </div>

      <div className="flex justify-end">
        <Button type="button" isLoading={isSaving} onClick={guardar}>Guardar cambios</Button>
      </div>

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

// ─── Página ───────────────────────────────────────────────────────────────────

export function ContentPage(): React.ReactElement {
  const [tab, setTab] = useState<TabKey>('HERO');

  return (
    <div>
      <div className="mb-xl">
        <h1 className="text-heading-lg font-medium text-ink">Contenido de portada</h1>
        <p className="mt-xs text-sm text-ink-mute">
          Administra los banners del hero, el cintillo promocional, la banda editorial y la franja de confianza de la tienda.
        </p>
      </div>

      <div className="mb-md flex flex-wrap gap-xs border-b border-hairline" role="tablist" aria-label="Secciones de contenido">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-md py-sm text-sm font-medium transition-colors',
              tab === t.key ? 'border-primary text-ink' : 'border-transparent text-ink-mute hover:text-ink'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'CONFIANZA' ? <ConfianzaTab /> : <BannerTab key={tab} ubicacion={tab} />}
    </div>
  );
}

export default ContentPage;
