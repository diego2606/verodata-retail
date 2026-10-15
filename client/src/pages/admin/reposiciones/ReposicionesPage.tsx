import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, PackagePlus, Plus, Truck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { reposicionesApi } from '../../../lib/reposicionesApi';
import { ApiClientError } from '../../../lib/apiClient';
import type { EstadoReposicion, ReposicionItem } from '../../../types/reposicion.types';
import { EstadoBadge } from './EstadoBadge';
import { formatearFecha, formatearMonto, idCorto } from './formato';

const LIMITE = 10;

const ESTADO_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'RECIBIDO', label: 'Recibidas' },
  { value: 'CANCELADO', label: 'Canceladas' },
];

const COLUMNAS = ['Orden', 'Proveedor', 'Emisión', 'Unidades', 'Monto', 'Estado'] as const;

function TableHeader(): React.ReactElement {
  return (
    <thead>
      <tr className="border-b border-hairline bg-canvas-soft">
        {COLUMNAS.map((label) => (
          <th
            key={label}
            className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute"
          >
            {label}
          </th>
        ))}
        <th className="px-3 py-2.5 text-right font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
          Detalle
        </th>
      </tr>
    </thead>
  );
}

function TableSkeleton(): React.ReactElement {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Cargando órdenes de reposición">
      <table className="w-full border-collapse">
        <TableHeader />
        <tbody className="divide-y divide-hairline-cool">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {COLUMNAS.map((col) => (
                <td key={col} className="px-3 py-2.5">
                  <div className="h-3 w-20 rounded-full bg-hairline-cool animate-pulse" />
                </td>
              ))}
              <td className="px-3 py-2.5">
                <div className="ml-auto h-5 w-16 rounded-xs bg-hairline-cool animate-pulse" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-retail-red/20 bg-retail-red/5"
        aria-hidden="true"
      >
        <AlertTriangle size={18} className="text-retail-red" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">No se pudo cargar el historial</p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          Ocurrió un error al consultar las órdenes de reposición.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-hairline bg-canvas-soft"
        aria-hidden="true"
      >
        <Truck size={18} className="text-ink-faint" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">
          {filtered ? 'Sin resultados' : 'Todavía no hay órdenes de reposición'}
        </p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          {filtered
            ? 'Ninguna orden coincide con el estado seleccionado.'
            : 'Registra tu primera compra a proveedor para reponer stock.'}
        </p>
      </div>
      {!filtered && (
        <Link
          to="/admin/reposiciones/nueva"
          className="inline-flex h-8 items-center gap-xs rounded-sm bg-primary px-md text-xs font-medium text-on-primary transition-colors hover:bg-primary-deep"
        >
          <Plus size={14} aria-hidden="true" />
          Nueva reposición
        </Link>
      )}
    </div>
  );
}

function FilaOrden({ orden }: { orden: ReposicionItem }): React.ReactElement {
  return (
    <tr className="transition-colors duration-150 hover:bg-canvas-soft">
      <td className="px-3 py-2.5 font-mono text-xs text-ink">{idCorto(orden.id)}</td>
      <td className="px-3 py-2.5 text-sm text-ink">{orden.proveedor_nombre}</td>
      <td className="px-3 py-2.5 text-sm text-ink-secondary">{formatearFecha(orden.fecha_emision)}</td>
      <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-ink">
        {orden.unidades_totales}
      </td>
      <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-ink">
        {formatearMonto(orden.costo_total)}
      </td>
      <td className="px-3 py-2.5">
        <EstadoBadge estado={orden.estado} />
      </td>
      <td className="px-3 py-2.5 text-right">
        <Link
          to={`/admin/reposiciones/${orden.id}`}
          className="inline-flex h-7 items-center rounded-sm border border-hairline px-sm text-xs text-ink transition-colors hover:bg-hairline-cool"
        >
          Ver detalle
        </Link>
      </td>
    </tr>
  );
}

export function ReposicionesPage(): React.ReactElement {
  const [ordenes, setOrdenes] = useState<ReposicionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<'' | EstadoReposicion>('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    reposicionesApi
      .listar({ page, limit: LIMITE, ...(estado ? { estado } : {}) })
      .then((json) => {
        if (!active) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setOrdenes(json.data.items);
        setTotal(json.data.total);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('[ReposicionesPage]', error instanceof ApiClientError ? error.message : error);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [page, estado, reloadKey]);

  const recargar = useCallback((): void => setReloadKey((k) => k + 1), []);
  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));
  const hayFiltro = estado !== '';

  return (
    <div>
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="text-heading-lg font-medium text-ink">Reposiciones</h1>
          <p className="mt-xs text-sm text-ink-mute">
            Órdenes de compra a proveedores y su ingreso al stock de la tienda.
          </p>
        </div>
        <Link
          to="/admin/reposiciones/nueva"
          className="inline-flex h-9 items-center gap-xs rounded-sm bg-primary px-md text-sm font-medium text-on-primary transition-colors hover:bg-primary-deep"
        >
          <PackagePlus size={15} aria-hidden="true" />
          Nueva reposición
        </Link>
      </div>

      <div className="mb-md flex flex-wrap items-center gap-sm">
        <Select
          value={estado}
          onChange={(valor) => {
            setEstado(valor as '' | EstadoReposicion);
            setPage(1);
          }}
          options={ESTADO_OPTIONS}
          aria-label="Filtrar por estado de la orden"
          containerClassName="relative min-w-[200px]"
        />
      </div>

      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        {status === 'loading' && <TableSkeleton />}
        {status === 'error' && <ErrorState onRetry={recargar} />}
        {status === 'ready' && ordenes.length === 0 && <EmptyState filtered={hayFiltro} />}

        {status === 'ready' && ordenes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHeader />
              <tbody className="divide-y divide-hairline-cool">
                {ordenes.map((orden) => (
                  <FilaOrden key={orden.id} orden={orden} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {status === 'ready' && total > 0 && (
        <div className="mt-sm flex flex-wrap items-center justify-between gap-sm">
          <p className="text-xs text-ink-mute">
            {total} orden{total === 1 ? '' : 'es'} · página {page} de {totalPaginas}
          </p>
          <div className="flex items-center gap-xs">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPaginas}
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReposicionesPage;
