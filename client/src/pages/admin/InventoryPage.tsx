import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Package, PackageX, Search, SlidersHorizontal, Warehouse } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';
import { AdjustStockModal } from '../../components/inventory/AdjustStockModal';
import type { AlertaStockItem, ProductoItem } from '../../types/product.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EstadoStock = 'ok' | 'bajo' | 'agotado';

function estadoDe(producto: ProductoItem): EstadoStock {
  if (producto.stock_actual <= 0) return 'agotado';
  if (producto.stock_actual <= producto.stock_minimo) return 'bajo';
  return 'ok';
}

const ESTADO_LABELS: Record<EstadoStock, string> = {
  ok: 'Disponible',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

const ESTADO_STYLES: Record<EstadoStock, { badge: string; dot: string }> = {
  ok: { badge: 'border-hairline-strong bg-canvas-soft text-ink-mute', dot: 'bg-primary' },
  bajo: { badge: 'border-retail-orange/40 bg-retail-orange/10 text-ink', dot: 'bg-retail-orange' },
  agotado: { badge: 'border-retail-red/40 bg-retail-red/5 text-ink', dot: 'bg-retail-red' },
};

const ESTADO_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todo el stock' },
  { value: 'bajo', label: 'En alerta (≤ mínimo)' },
  { value: 'agotado', label: 'Agotados' },
];

function EstadoBadge({ estado }: { estado: EstadoStock }): React.ReactElement {
  const styles = ESTADO_STYLES[estado];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-xs border px-xs py-xxs text-xs leading-none',
        styles.badge
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} aria-hidden="true" />
      {ESTADO_LABELS[estado]}
    </span>
  );
}

const COLUMNS = ['SKU', 'Producto', 'Categoría', 'Stock', 'Mínimo', 'Estado'] as const;

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

interface ProductoRowProps {
  producto: ProductoItem;
  onAdjust: (producto: ProductoItem) => void;
}

function ProductoRow({ producto: p, onAdjust }: ProductoRowProps): React.ReactElement {
  const estado = estadoDe(p);
  return (
    <tr className="transition-colors duration-150 hover:bg-canvas-soft">
      <td className="px-3 py-2.5 font-mono text-xs text-ink">{p.sku}</td>
      <td className="px-3 py-2.5">
        <p className="text-sm text-ink">{p.nombre}</p>
        {p.modelo && <p className="mt-xxs text-xs text-ink-mute">{p.modelo}</p>}
      </td>
      <td className="px-3 py-2.5 text-sm text-ink-secondary">{p.categoria_nombre}</td>
      <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-ink">{p.stock_actual}</td>
      <td className="px-3 py-2.5 font-mono text-sm tabular-nums text-ink-mute">{p.stock_minimo}</td>
      <td className="px-3 py-2.5">
        <EstadoBadge estado={estado} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={() => onAdjust(p)}>
            <SlidersHorizontal size={12} aria-hidden="true" />
            Ajustar
          </Button>
        </div>
      </td>
    </tr>
  );
}

function TableSkeleton(): React.ReactElement {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Cargando inventario">
      <table className="w-full border-collapse">
        <TableHeader />
        <tbody className="divide-y divide-hairline-cool">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5"><div className="h-3 w-20 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-36 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-24 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-10 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-10 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-4 w-20 rounded-xs bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="ml-auto h-5 w-20 rounded-xs bg-hairline-cool animate-pulse" /></td>
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
        <p className="text-sm font-medium text-ink">No se pudo cargar el inventario</p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          Ocurrió un error al consultar el stock. Intenta nuevamente.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-hairline bg-canvas-soft"
        aria-hidden="true"
      >
        <Warehouse size={18} className="text-ink-faint" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">
          {filtered ? 'Sin resultados' : 'Sin inventario'}
        </p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          {filtered
            ? 'Ningún SKU coincide con la búsqueda o el filtro de estado aplicado.'
            : 'Aún no hay productos registrados para monitorear stock.'}
        </p>
      </div>
      {filtered && (
        <Button type="button" variant="secondary" size="sm" onClick={onClear}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: 'neutral' | 'alert' | 'danger';
}

function StatCard({ label, value, icon: Icon, tone }: StatCardProps): React.ReactElement {
  const toneStyles = {
    neutral: 'border-hairline text-ink',
    alert: 'border-retail-orange/40 text-retail-orange',
    danger: 'border-retail-red/40 text-retail-red',
  }[tone];
  return (
    <div className="rounded-sm border border-hairline bg-canvas px-md py-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-mute">{label}</p>
        <Icon size={14} className={toneStyles.split(' ').pop()} aria-hidden="true" />
      </div>
      <p className="mt-xs font-mono text-heading-md tabular-nums text-ink">{value}</p>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export function InventoryPage(): React.ReactElement {
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [alertas, setAlertas] = useState<AlertaStockItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'' | 'bajo' | 'agotado'>('');

  const [adjusting, setAdjusting] = useState<ProductoItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    Promise.all([
      apiClient.get<ProductoItem[]>('/api/v1/products'),
      apiClient.get<AlertaStockItem[]>('/api/v1/inventory/alerts'),
    ])
      .then(([productosJson, alertasJson]) => {
        if (!active) return;
        if (!productosJson.success || !alertasJson.success) {
          setStatus('error');
          return;
        }
        setProductos(productosJson.data);
        setAlertas(alertasJson.data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

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

  const handleAdjusted = useCallback(
    (message: string): void => {
      setAdjusting(null);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const filtrados = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return productos.filter(p => {
      if (estadoFilter) {
        const estado = estadoDe(p);
        if (estadoFilter === 'agotado' && estado !== 'agotado') return false;
        if (estadoFilter === 'bajo' && estado === 'ok') return false;
      }
      if (term) {
        return (
          p.nombre.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.categoria_nombre.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [productos, debouncedSearch, estadoFilter]);

  const agotados = useMemo(
    () => productos.filter(p => p.stock_actual <= 0).length,
    [productos]
  );

  const hayFiltros = Boolean(debouncedSearch || estadoFilter);

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="text-heading-lg font-medium text-ink">Inventario</h1>
          <p className="mt-xs text-sm text-ink-mute">
            Existencias físicas por SKU y alertas de reposición.
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="mb-lg grid grid-cols-1 gap-sm sm:grid-cols-3">
        <StatCard label="SKUs monitoreados" value={productos.length} icon={Package} tone="neutral" />
        <StatCard label="En alerta de reposición" value={alertas.length} icon={AlertTriangle} tone="alert" />
        <StatCard label="Agotados" value={agotados} icon={PackageX} tone="danger" />
      </div>

      {/* Filtros */}
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
            placeholder="Buscar por nombre, SKU o categoría…"
            aria-label="Buscar en inventario"
            className="pl-xl"
          />
        </div>
        <Select
          value={estadoFilter}
          onChange={value => setEstadoFilter(value as '' | 'bajo' | 'agotado')}
          options={ESTADO_FILTER_OPTIONS}
          aria-label="Filtrar por estado de stock"
          containerClassName="relative min-w-[200px]"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        {status === 'loading' && <TableSkeleton />}
        {status === 'error' && <ErrorState onRetry={reload} />}
        {status === 'ready' && filtrados.length === 0 && (
          <EmptyState filtered={hayFiltros} onClear={clearFilters} />
        )}

        {status === 'ready' && filtrados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHeader />
              <tbody className="divide-y divide-hairline-cool">
                {filtrados.map(p => (
                  <ProductoRow key={p.id} producto={p} onAdjust={setAdjusting} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {status === 'ready' && filtrados.length > 0 && (
        <p className="mt-sm text-xs text-ink-mute">
          {filtrados.length} SKU{filtrados.length === 1 ? '' : 's'} listado
          {filtrados.length === 1 ? '' : 's'}.
        </p>
      )}

      {adjusting && (
        <AdjustStockModal
          producto={adjusting}
          onClose={() => setAdjusting(null)}
          onAdjusted={handleAdjusted}
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

export default InventoryPage;
