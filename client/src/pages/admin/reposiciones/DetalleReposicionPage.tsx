import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { Modal } from '../../../components/ui/Modal';
import { reposicionesApi } from '../../../lib/reposicionesApi';
import type { ReposicionDetalle } from '../../../types/reposicion.types';
import { EstadoBadge } from './EstadoBadge';
import {
  formatearAtributos,
  formatearFecha,
  formatearFechaSoloDia,
  formatearMonto,
  idCorto,
} from './formato';

function Dato({ label, valor }: { label: string; valor: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <dt className="text-xs text-ink-mute">{label}</dt>
      <dd className="mt-xxs text-sm text-ink">{valor}</dd>
    </div>
  );
}

export function DetalleReposicionPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orden, setOrden] = useState<ReposicionDetalle | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [recibiendo, setRecibiendo] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setStatus('loading');

    reposicionesApi
      .obtener(id)
      .then((json) => {
        if (!active) return;
        if (!json.success) {
          setError(json.error.message);
          setStatus('error');
          return;
        }
        setOrden(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const volver = useCallback((): void => {
    void navigate('/admin/reposiciones');
  }, [navigate]);

  const recibir = useCallback(async (): Promise<void> => {
    if (!id) return;
    setRecibiendo(true);
    setError(null);
    try {
      const json = await reposicionesApi.recibir(id);
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      // Actualización optimista: el botón se deshabilita al instante.
      setOrden((prev) =>
        prev ? { ...prev, estado: 'RECIBIDO', recibido_en: new Date().toISOString() } : prev
      );
      setToast(
        `Recepción confirmada: ${json.data.unidades_ingresadas} unidad(es) sumadas al stock de la tienda online.`
      );
      setReloadKey((k) => k + 1);
    } catch {
      setError('No se pudo confirmar la recepción.');
    } finally {
      setRecibiendo(false);
    }
  }, [id]);

  const cancelar = useCallback(async (): Promise<void> => {
    if (!id) return;
    setRecibiendo(true);
    setError(null);
    try {
      const json = await reposicionesApi.cancelar(id, motivo.trim() || null);
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setCancelando(false);
      setMotivo('');
      setOrden((prev) => (prev ? { ...prev, estado: 'CANCELADO', motivo_cancelacion: motivo.trim() || null } : prev));
      setToast('Orden cancelada. El stock de la tienda no se modificó.');
      setReloadKey((k) => k + 1);
    } catch {
      setError('No se pudo cancelar la orden.');
    } finally {
      setRecibiendo(false);
    }
  }, [id, motivo]);

  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Cargando orden" className="space-y-md">
        <div className="h-6 w-56 rounded-full bg-hairline-cool animate-pulse" />
        <div className="h-40 rounded-sm border border-hairline bg-canvas" />
        <div className="h-64 rounded-sm border border-hairline bg-canvas" />
      </div>
    );
  }

  if (status === 'error' || !orden) {
    return (
      <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-sm border border-retail-red/20 bg-retail-red/5"
          aria-hidden="true"
        >
          <AlertTriangle size={18} className="text-retail-red" />
        </div>
        <p className="text-sm font-medium text-ink">{error ?? 'No se pudo cargar la orden'}</p>
        <div className="flex gap-sm">
          <Button type="button" variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Reintentar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={volver}>
            Volver al historial
          </Button>
        </div>
      </div>
    );
  }

  const esPendiente = orden.estado === 'PENDIENTE';

  return (
    <div>
      <div className="mb-xl flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={volver}
            aria-label="Volver a reposiciones"
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-hairline text-ink-mute transition-colors hover:bg-hairline-cool hover:text-ink"
          >
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
          <div>
            <div className="flex items-center gap-sm">
              <h1 className="text-heading-lg font-medium text-ink">
                Orden {idCorto(orden.id)}
              </h1>
              <EstadoBadge estado={orden.estado} />
            </div>
            <p className="text-xs text-ink-mute">{orden.proveedor_nombre}</p>
          </div>
        </div>
        {esPendiente && (
          <div className="flex items-center gap-sm">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCancelando(true)}
              disabled={recibiendo}
            >
              <XCircle size={15} aria-hidden="true" />
              Cancelar orden
            </Button>
            <Button
              type="button"
              isLoading={recibiendo}
              disabled={recibiendo}
              onClick={() => void recibir()}
            >
              <PackageCheck size={16} aria-hidden="true" />
              Confirmar Recepción de Mercadería
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="mb-md rounded-sm border border-retail-red/30 bg-retail-red/5 px-sm py-xs text-xs text-retail-red"
        >
          {error}
        </p>
      )}

      {!esPendiente && (
        <div
          className={
            orden.estado === 'RECIBIDO'
              ? 'mb-md flex items-center gap-sm rounded-sm border border-primary/30 bg-primary/5 px-sm py-xs text-xs text-ink'
              : 'mb-md flex items-center gap-sm rounded-sm border border-retail-red/30 bg-retail-red/5 px-sm py-xs text-xs text-ink'
          }
          role="status"
        >
          {orden.estado === 'RECIBIDO' ? (
            <>
              <CheckCircle2 size={15} className="text-primary" aria-hidden="true" />
              Recepción confirmada el {formatearFecha(orden.recibido_en)}: el stock ya está sumado a la tienda
              online.
            </>
          ) : (
            <>
              <XCircle size={15} className="text-retail-red" aria-hidden="true" />
              Orden cancelada. El stock de la tienda no se modificó.
            </>
          )}
        </div>
      )}

      <section className="mb-xl rounded-sm border border-hairline bg-canvas p-lg">
        <h2 className="mb-md text-heading-md font-medium text-ink">Datos de la orden</h2>
        <dl className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <Dato label="Proveedor" valor={orden.proveedor_nombre} />
          <Dato label="Emisión" valor={formatearFecha(orden.fecha_emision)} />
          <Dato label="Arribo estimado" valor={formatearFechaSoloDia(orden.fecha_estimada_arribo)} />
          <Dato label="Unidades totales" valor={<span className="font-mono tabular-nums">{orden.unidades_totales}</span>} />
          <Dato label="Costo total" valor={<span className="font-mono tabular-nums">{formatearMonto(orden.costo_total)}</span>} />
          <Dato label="Recibido" valor={formatearFecha(orden.recibido_en)} />
          <Dato label="Creada" valor={formatearFecha(orden.creado_en)} />
          {orden.motivo_cancelacion && <Dato label="Motivo de cancelación" valor={orden.motivo_cancelacion} />}
          {orden.notas && (
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="text-xs text-ink-mute">Notas</dt>
              <dd className="mt-xxs whitespace-pre-line text-sm text-ink-secondary">{orden.notas}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        <div className="border-b border-hairline bg-canvas-soft px-lg py-sm">
          <h2 className="text-heading-md font-medium text-ink">Productos de la orden</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-hairline">
                {['SKU', 'Producto', 'Costo unitario', 'Cantidad', 'Subtotal'].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-cool">
              {orden.detalles.map((linea) => (
                <tr key={linea.id}>
                  <td className="px-3 py-2.5 font-mono text-xs text-ink">{linea.sku}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm text-ink">{linea.producto_nombre}</p>
                    {Object.keys(linea.atributos).length > 0 && (
                      <p className="mt-xxs text-xs text-ink-mute">
                        {formatearAtributos(linea.atributos)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-ink">
                    {formatearMonto(linea.costo_unitario)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-ink">
                    {linea.cantidad_pedida}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-ink">
                    {formatearMonto(linea.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-hairline bg-canvas-soft">
                <td className="px-3 py-2.5 text-xs text-ink-mute" colSpan={3}>
                  {orden.detalles.length} línea{orden.detalles.length === 1 ? '' : 's'}
                </td>
                <td className="px-3 py-2.5 font-mono text-sm font-medium tabular-nums text-ink">
                  {orden.unidades_totales}
                </td>
                <td className="px-3 py-2.5 font-mono text-sm font-medium tabular-nums text-ink">
                  {formatearMonto(orden.costo_total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {cancelando && (
        <Modal onClose={() => setCancelando(false)} labelledBy="cancelar-titulo">
          <div className="p-lg">
            <h2 id="cancelar-titulo" className="text-heading-md font-medium text-ink">
              Cancelar orden {idCorto(orden.id)}
            </h2>
            <p className="mt-xs text-xs text-ink-mute">
              La orden quedará anulada y no se sumará stock. Solo se puede cancelar mientras esté pendiente.
            </p>
            <div className="mt-md">
              <label htmlFor="motivo" className="mb-xs block text-xs font-medium text-ink">
                Motivo (opcional)
              </label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. el proveedor no tiene stock disponible"
                rows={2}
              />
            </div>
            <div className="mt-lg flex justify-end gap-sm">
              <Button type="button" variant="secondary" onClick={() => setCancelando(false)}>
                Volver
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={recibiendo}
                onClick={() => void cancelar()}
              >
                Cancelar orden
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-xl right-xl z-[60] flex items-center gap-sm rounded-sm border border-primary/30 bg-canvas px-md py-sm"
        >
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          <p className="text-xs font-medium text-ink">{toast}</p>
        </div>
      )}

      <p className="mt-md text-xs text-ink-mute">
        ¿Necesitas otra orden?{' '}
        <Link to="/admin/reposiciones/nueva" className="text-primary hover:underline">
          Crear nueva reposición
        </Link>
      </p>
    </div>
  );
}

export default DetalleReposicionPage;
