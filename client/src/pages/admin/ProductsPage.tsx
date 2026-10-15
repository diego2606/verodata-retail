import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Layers,
  Package,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import { AdjustStockModal } from '../../components/inventory/AdjustStockModal';
import { opcionesCategoriaJerarquicas } from '../../lib/categorias';
import type { CategoriaItem } from '../../types/category.types';
import type { ProductoItem } from '../../types/product.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const precioFmt = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

function formatearPrecio(valor: number): string {
  return precioFmt.format(valor);
}

const ATRIBUTO_LABELS: Record<string, string> = {
  COLOR: 'Color',
  SIZE: 'Talla',
  CAPACITY: 'Capacidad',
  STORAGE_CAPACITY: 'Almacenamiento',
  MODEL: 'Modelo (código)',
  GENDER: 'Género',
  LINE: 'Línea',
  BRAND: 'Marca',
};

/** Atributos no vacíos de una variante, con etiqueta legible. */
function listarAtributos(producto: ProductoItem): Array<{ label: string; value: string }> {
  return Object.entries(producto.atributos)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({ label: ATRIBUTO_LABELS[key] ?? key, value }));
}

interface GrupoProducto {
  key: string;
  modelo: string | null;
  items: ProductoItem[];
}

/** Agrupa las fichas por `modelo`; las que no tienen modelo van sueltas. */
function agruparPorModelo(productos: ProductoItem[]): GrupoProducto[] {
  const grupos: GrupoProducto[] = [];
  const indice = new Map<string, number>();
  for (const p of productos) {
    if (!p.modelo) {
      grupos.push({ key: p.id, modelo: null, items: [p] });
      continue;
    }
    const clave = `m:${p.modelo}`;
    const pos = indice.get(clave);
    if (pos !== undefined) {
      grupos[pos].items.push(p);
    } else {
      indice.set(clave, grupos.length);
      grupos.push({ key: clave, modelo: p.modelo, items: [p] });
    }
  }
  return grupos;
}

function estaBajo(producto: ProductoItem): boolean {
  return producto.stock_actual <= producto.stock_minimo;
}

const ESTADO_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
];

const STOCK_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todo el stock' },
  { value: 'solo', label: 'Solo stock bajo' },
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
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function PrecioCell({ producto }: { producto: ProductoItem }): React.ReactElement {
  if (producto.precio_oferta !== null) {
    const descuento = Math.round((1 - producto.precio_oferta / producto.precio_regular) * 100);
    return (
      <div className="flex flex-col">
        <span className="flex items-center gap-xs">
          <span className="text-sm font-medium tabular-nums text-ink">
            {formatearPrecio(producto.precio_oferta)}
          </span>
          <span className="rounded-xs bg-primary/10 px-xs py-xxs font-mono text-xs text-primary-ink">
            -{descuento}%
          </span>
        </span>
        <span className="text-xs tabular-nums text-ink-faint line-through">
          {formatearPrecio(producto.precio_regular)}
        </span>
      </div>
    );
  }
  return (
    <span className="text-sm font-medium tabular-nums text-ink">
      {formatearPrecio(producto.precio_regular)}
    </span>
  );
}

const COLUMNS = ['SKU', 'Producto', 'Categoría', 'Precio', 'Stock', 'Estado'] as const;

function Thumbnail({ src, alt }: { src: string | null; alt: string }): React.ReactElement {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-hairline bg-canvas-soft"
        aria-hidden="true"
      >
        <Package size={16} className="text-ink-faint" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className="h-10 w-10 shrink-0 rounded-xs border border-hairline object-cover"
    />
  );
}

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
    <div className="overflow-x-auto" aria-busy="true" aria-label="Cargando productos">
      <table className="w-full border-collapse">
        <TableHeader />
        <tbody className="divide-y divide-hairline-cool">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5"><div className="h-3 w-20 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-sm">
                  <div className="h-10 w-10 shrink-0 rounded-xs bg-hairline-cool animate-pulse" />
                  <div className="h-3 w-32 rounded-full bg-hairline-cool animate-pulse" />
                </div>
              </td>
              <td className="px-3 py-2.5"><div className="h-3 w-24 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-16 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-3 w-10 rounded-full bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="h-4 w-16 rounded-xs bg-hairline-cool animate-pulse" /></td>
              <td className="px-3 py-2.5"><div className="ml-auto h-5 w-20 rounded-xs bg-hairline-cool animate-pulse" /></td>
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
        <Package size={18} className="text-ink-faint" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">
          {filtered ? 'Sin resultados' : 'Sin productos'}
        </p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          {filtered
            ? 'Ningún producto coincide con la búsqueda o los filtros aplicados.'
            : 'Crea el primer artículo para publicarlo en el catálogo.'}
        </p>
      </div>
      {filtered ? (
        <Button type="button" variant="secondary" size="sm" onClick={onClear}>
          Limpiar filtros
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus size={13} aria-hidden="true" />
          Nuevo producto
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
        <p className="text-sm font-medium text-ink">No se pudo cargar el catálogo</p>
        <p className="mt-xs max-w-xs text-xs text-ink-mute">
          Ocurrió un error al consultar los productos. Vuelve a intentarlo.
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

// ─── Filas de la tabla ────────────────────────────────────────────────────────

function StockCell({ producto }: { producto: ProductoItem }): React.ReactElement {
  return (
    <div className="flex items-center gap-xs">
      <span className="font-mono text-xs tabular-nums text-ink">{producto.stock_actual}</span>
      {estaBajo(producto) && (
        <span className="rounded-xs border border-retail-red/30 bg-retail-red/5 px-xs py-xxs text-[10px] font-medium leading-none text-retail-red">
          Bajo
        </span>
      )}
    </div>
  );
}

interface ProductRowProps {
  producto: ProductoItem;
  indent?: boolean;
  onEdit: (producto: ProductoItem) => void;
  onAdjust: (producto: ProductoItem) => void;
  onToggleActivo: (producto: ProductoItem) => void;
  toggling?: boolean;
}

function ProductRow({
  producto: p,
  indent = false,
  onEdit,
  onAdjust,
  onToggleActivo,
  toggling = false,
}: ProductRowProps): React.ReactElement {
  const atributos = listarAtributos(p);
  return (
    <tr className="transition-colors duration-150 hover:bg-canvas-soft">
      <td className={cn('px-3 py-2.5 font-mono text-xs text-ink', indent && 'pl-xl')}>{p.sku}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-sm">
          {indent && <span className="h-8 w-px shrink-0 bg-hairline" aria-hidden="true" />}
          <Thumbnail src={p.imagen_url} alt={p.nombre} />
          <div className="min-w-0">
            <p className="text-sm text-ink">{p.nombre}</p>
            {atributos.length > 0 ? (
              <div className="mt-xxs flex flex-wrap gap-xs">
                {atributos.map(a => (
                  <span
                    key={a.label}
                    className="rounded-xs border border-hairline-cool bg-canvas-soft px-xs py-xxs text-[10px] leading-none text-ink-mute"
                  >
                    {a.label}: {a.value}
                  </span>
                ))}
              </div>
            ) : (
              p.descripcion && (
                <p className="mt-xxs max-w-xs truncate text-xs text-ink-mute">{p.descripcion}</p>
              )
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-ink-secondary">{p.categoria_nombre}</td>
      <td className="px-3 py-2.5">
        <PrecioCell producto={p} />
      </td>
      <td className="px-3 py-2.5" title={`Stock mínimo: ${p.stock_minimo}`}>
        <StockCell producto={p} />
      </td>
      <td className="px-3 py-2.5">
        <EstadoBadge activo={p.activo} />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-xs">
          <Button type="button" variant="secondary" size="sm" onClick={() => onAdjust(p)}>
            <SlidersHorizontal size={12} aria-hidden="true" />
            Stock
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onEdit(p)}>
            <Pencil size={12} aria-hidden="true" />
            Editar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={toggling}
            onClick={() => onToggleActivo(p)}
          >
            {p.activo ? (
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
  );
}

interface GrupoRowProps {
  grupo: GrupoProducto;
  expandido: boolean;
  onToggle: () => void;
  onEditModelo: (grupo: GrupoProducto) => void;
}

function GrupoRow({ grupo, expandido, onToggle, onEditModelo }: GrupoRowProps): React.ReactElement {
  const { items, modelo } = grupo;
  const primero = items[0];
  const precios = items.map(i => i.precio_oferta ?? i.precio_regular);
  const minimo = Math.min(...precios);
  const maximo = Math.max(...precios);
  const stockTotal = items.reduce((acc, i) => acc + i.stock_actual, 0);
  const activos = items.filter(i => i.activo).length;

  return (
    <tr className="bg-canvas-soft/60 transition-colors duration-150 hover:bg-canvas-soft">
      <td className="px-3 py-2.5">
        <span className="rounded-xs border border-hairline-cool bg-canvas px-xs py-xxs font-mono text-[10px] leading-none text-ink-mute">
          {items.length} SKU
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expandido}
            aria-label={expandido ? 'Contraer variantes' : 'Expandir variantes'}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border border-hairline text-ink-mute transition-colors hover:bg-hairline-cool hover:text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            {expandido ? (
              <ChevronDown size={13} aria-hidden="true" />
            ) : (
              <ChevronRight size={13} aria-hidden="true" />
            )}
          </button>
          <Thumbnail src={primero.imagen_url} alt={modelo ?? primero.nombre} />
          <div className="min-w-0">
            <p className="flex items-center gap-xs text-sm font-medium text-ink">
              <Layers size={12} className="shrink-0 text-ink-faint" aria-hidden="true" />
              <span className="truncate">{modelo}</span>
            </p>
            <p className="mt-xxs text-xs text-ink-mute">{items.length} variantes con SKU propio</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-ink-secondary">{primero.categoria_nombre}</td>
      <td className="px-3 py-2.5 text-sm tabular-nums text-ink">
        {minimo === maximo
          ? formatearPrecio(minimo)
          : `${formatearPrecio(minimo)} – ${formatearPrecio(maximo)}`}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-xs">
          <span className="font-mono text-xs tabular-nums text-ink">{stockTotal}</span>
          {items.some(estaBajo) && (
            <span className="rounded-xs border border-retail-red/30 bg-retail-red/5 px-xs py-xxs text-[10px] font-medium leading-none text-retail-red">
              Bajo
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-ink-mute">
        {activos}/{items.length} activos
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-xs">
          <Button type="button" variant="secondary" size="sm" onClick={onToggle}>
            {expandido ? 'Contraer' : 'Ver variantes'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onEditModelo(grupo)}>
            <Pencil size={12} aria-hidden="true" />
            Editar
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export function ProductsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'' | 'activo' | 'inactivo'>('');
  const [stockBajoFilter, setStockBajoFilter] = useState<'' | 'solo'>('');
  const [agrupar, setAgrupar] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [adjusting, setAdjusting] = useState<ProductoItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Categorías para el filtro
  useEffect(() => {
    let active = true;
    apiClient
      .get<CategoriaItem[]>('/api/v1/categories')
      .then(json => {
        if (active && json.success) setCategorias(json.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Productos
  useEffect(() => {
    let active = true;
    setStatus('loading');

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoriaFilter) params.set('categoria_id', categoriaFilter);
    if (estadoFilter) params.set('activo', estadoFilter === 'activo' ? 'true' : 'false');
    if (stockBajoFilter === 'solo') params.set('stock_bajo', 'true');
    const qs = params.toString();

    apiClient
      .get<ProductoItem[]>(`/api/v1/products${qs ? `?${qs}` : ''}`)
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setProductos(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, categoriaFilter, estadoFilter, stockBajoFilter, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const reload = useCallback((): void => setReloadKey(k => k + 1), []);

  const clearFilters = useCallback((): void => {
    setSearch('');
    setCategoriaFilter('');
    setEstadoFilter('');
    setStockBajoFilter('');
  }, []);

  const irACrear = useCallback((): void => {
    void navigate('/admin/products/new');
  }, [navigate]);

  const irAEditar = useCallback(
    (producto: ProductoItem): void => {
      void navigate(`/admin/products/${producto.id}/edit`);
    },
    [navigate]
  );

  // El listado agrupa por `modelo`; "Editar" abre el primer SKU del grupo
  // (la vista de edición carga el modelo completo y todas sus variantes).
  const irAEditarGrupo = useCallback(
    (grupo: GrupoProducto): void => {
      const primero = grupo.items[0];
      if (primero) void navigate(`/admin/products/${primero.id}/edit`);
    },
    [navigate]
  );

  const handleAdjusted = useCallback(
    (message: string): void => {
      setAdjusting(null);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const toggleActivo = useCallback(
    async (producto: ProductoItem): Promise<void> => {
      setTogglingId(producto.id);
      try {
        const json = await apiClient.patch<ProductoItem>(`/api/v1/products/${producto.id}`, {
          activo: !producto.activo,
        });
        if (!json.success) {
          setToast({ type: 'error', message: json.error.message });
        } else {
          setToast({
            type: 'success',
            message: producto.activo ? 'Producto desactivado' : 'Producto activado',
          });
          reload();
        }
      } catch (error) {
        setToast({
          type: 'error',
          message:
            error instanceof ApiClientError ? error.message : 'Error al actualizar el producto',
        });
      } finally {
        setTogglingId(null);
      }
    },
    [reload]
  );

  const toggleExpandido = useCallback((key: string): void => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const hayFiltros = useMemo(
    () => Boolean(debouncedSearch || categoriaFilter || estadoFilter || stockBajoFilter),
    [debouncedSearch, categoriaFilter, estadoFilter, stockBajoFilter]
  );

  const grupos = useMemo(
    () =>
      agrupar
        ? agruparPorModelo(productos)
        : productos.map(p => ({ key: p.id, modelo: null, items: [p] })),
    [productos, agrupar]
  );

  const categoriaFilterOptions: SelectOption[] = [
    { value: '', label: 'Todas las categorías' },
    ...opcionesCategoriaJerarquicas(categorias),
  ];

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-xl flex flex-wrap items-end justify-between gap-md">
        <div>
          <h1 className="text-heading-lg font-medium text-ink">Catálogo</h1>
          <p className="mt-xs text-sm text-ink-mute">
            Productos (modelo) y sus variantes publicadas en la tienda.
          </p>
        </div>
        <Button type="button" onClick={irACrear}>
          <Plus size={15} aria-hidden="true" />
          Nuevo producto
        </Button>
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
            placeholder="Buscar por nombre o SKU…"
            aria-label="Buscar producto por nombre o SKU"
            className="pl-xl"
          />
        </div>
        <Select
          value={categoriaFilter}
          onChange={setCategoriaFilter}
          options={categoriaFilterOptions}
          aria-label="Filtrar por categoría"
          containerClassName="relative min-w-[180px]"
        />
        <Select
          value={estadoFilter}
          onChange={value => setEstadoFilter(value as '' | 'activo' | 'inactivo')}
          options={ESTADO_FILTER_OPTIONS}
          aria-label="Filtrar por estado"
          containerClassName="relative min-w-[160px]"
        />
        <Select
          value={stockBajoFilter}
          onChange={value => setStockBajoFilter(value as '' | 'solo')}
          options={STOCK_FILTER_OPTIONS}
          aria-label="Filtrar por stock"
          containerClassName="relative min-w-[170px]"
        />
        <Button
          type="button"
          variant={agrupar ? 'primary' : 'secondary'}
          size="md"
          aria-pressed={agrupar}
          onClick={() => setAgrupar(value => !value)}
        >
          <Layers size={14} aria-hidden="true" />
          Agrupar por modelo
        </Button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        {status === 'loading' && <TableSkeleton />}
        {status === 'error' && <ErrorState onRetry={reload} />}
        {status === 'ready' && productos.length === 0 && (
          <EmptyState filtered={hayFiltros} onCreate={irACrear} onClear={clearFilters} />
        )}

        {status === 'ready' && productos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHeader />
              <tbody className="divide-y divide-hairline-cool">
                {grupos.map(grupo =>
                  grupo.items.length === 1 ? (
                    <ProductRow
                      key={grupo.key}
                      producto={grupo.items[0]}
                      onEdit={irAEditar}
                      onAdjust={setAdjusting}
                      onToggleActivo={toggleActivo}
                      toggling={togglingId === grupo.items[0].id}
                    />
                  ) : (
                    <React.Fragment key={grupo.key}>
                      <GrupoRow
                        grupo={grupo}
                        expandido={expandidos.has(grupo.key)}
                        onToggle={() => toggleExpandido(grupo.key)}
                        onEditModelo={irAEditarGrupo}
                      />
                      {expandidos.has(grupo.key) &&
                        grupo.items.map(p => (
                          <ProductRow
                            key={p.id}
                            producto={p}
                            indent
                            onEdit={irAEditar}
                            onAdjust={setAdjusting}
                            onToggleActivo={toggleActivo}
                            toggling={togglingId === p.id}
                          />
                        ))}
                    </React.Fragment>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hayFiltros && status === 'ready' && productos.length > 0 && (
        <p className="mt-sm text-xs text-ink-mute">
          {productos.length} resultado{productos.length === 1 ? '' : 's'} encontrado{productos.length === 1 ? '' : 's'}.
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

export default ProductsPage;
