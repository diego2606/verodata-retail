import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { apiClient } from '../../../lib/apiClient';
import { reposicionesApi } from '../../../lib/reposicionesApi';
import type { CrearReposicionPayload, LineaDraft, ProveedorItem } from '../../../types/reposicion.types';
import type { ProductoItem } from '../../../types/product.types';
import { aNumero, calcularTotales, subtotalLinea } from './totales';
import { lineasReducer, validarLineas } from './lineasReducer';
import { formatearMonto } from './formato';

const labelClass = 'block text-xs font-medium text-ink mb-xs';

function FilaLinea({
  linea,
  productos,
  onChange,
  onQuitar,
  puedeQuitar,
}: {
  linea: LineaDraft;
  productos: ProductoItem[];
  onChange: (campo: 'producto_id' | 'costo_unitario' | 'cantidad_pedida', valor: string) => void;
  onQuitar: () => void;
  puedeQuitar: boolean;
}): React.ReactElement {
  const opciones = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Selecciona un producto' },
      ...productos.map((p) => ({
        value: p.id,
        label: `${p.sku} · ${p.nombre}${p.stock_actual !== undefined ? ` (stock ${p.stock_actual})` : ''}`,
      })),
    ],
    [productos]
  );

  return (
    <tr className="align-middle">
      <td className="px-2 py-2">
        <Select
          value={linea.producto_id}
          onChange={(valor) => onChange('producto_id', valor)}
          options={opciones}
          aria-label="Producto de la línea"
          containerClassName="relative min-w-[260px]"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={linea.costo_unitario}
          onChange={(e) => onChange('costo_unitario', e.target.value)}
          placeholder="0.00"
          aria-label="Costo unitario"
          className="w-28 text-right"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          min={1}
          step="1"
          inputMode="numeric"
          value={linea.cantidad_pedida}
          onChange={(e) => onChange('cantidad_pedida', e.target.value)}
          placeholder="0"
          aria-label="Cantidad pedida"
          className="w-24 text-right"
        />
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm tabular-nums text-ink">
        {formatearMonto(subtotalLinea(linea))}
      </td>
      <td className="px-2 py-2 text-right">
        <button
          type="button"
          onClick={onQuitar}
          disabled={!puedeQuitar}
          aria-label="Quitar línea"
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-hairline text-ink-mute transition-colors hover:bg-hairline-cool hover:text-ink disabled:opacity-40"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export function NuevaReposicionPage(): React.ReactElement {
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [proveedorId, setProveedorId] = useState('');
  const [fecha, setFecha] = useState('');
  const [notas, setNotas] = useState('');
  const [lineas, dispatch] = useReducer(lineasReducer, []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    Promise.all([
      reposicionesApi.listarProveedores(),
      apiClient.get<ProductoItem[]>('/api/v1/products'),
    ])
      .then(([proveedoresJson, productosJson]) => {
        if (!active) return;
        if (!proveedoresJson.success || !productosJson.success) {
          setStatus('error');
          return;
        }
        setProveedores(proveedoresJson.data);
        setProductos(productosJson.data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const proveedorOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Selecciona un proveedor' },
      ...proveedores.map((p) => ({ value: p.id, label: p.nombre_empresa })),
    ],
    [proveedores]
  );

  const totales = useMemo(() => calcularTotales(lineas), [lineas]);

  const agregarLinea = useCallback((): void => {
    dispatch({ type: 'agregar', key: crypto.randomUUID() });
  }, []);

  const guardar = useCallback(async (): Promise<void> => {
    if (!proveedorId) {
      setError('Selecciona un proveedor para la orden.');
      return;
    }
    const errorLineas = validarLineas(lineas);
    if (errorLineas) {
      setError(errorLineas);
      return;
    }

    const payload: CrearReposicionPayload = {
      proveedor_id: proveedorId,
      fecha_estimada_arribo: fecha || null,
      notas: notas.trim() || null,
      detalles: lineas.map((linea) => ({
        producto_id: linea.producto_id,
        costo_unitario: aNumero(linea.costo_unitario),
        cantidad_pedida: aNumero(linea.cantidad_pedida),
      })),
    };

    setGuardando(true);
    setError(null);
    try {
      const json = await reposicionesApi.crear(payload);
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      void navigate(`/admin/reposiciones/${json.data.id}`);
    } catch {
      setError('No se pudo crear la orden de reposición.');
    } finally {
      setGuardando(false);
    }
  }, [proveedorId, fecha, notas, lineas, navigate]);

  const volver = useCallback((): void => {
    void navigate('/admin/reposiciones');
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Cargando formulario" className="space-y-md">
        <div className="h-6 w-56 rounded-full bg-hairline-cool animate-pulse" />
        <div className="grid gap-xl lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <div className="h-80 rounded-sm border border-hairline bg-canvas" />
          <div className="h-40 rounded-sm border border-hairline bg-canvas" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-sm border border-retail-red/20 bg-retail-red/5"
          aria-hidden="true"
        >
          <AlertTriangle size={18} className="text-retail-red" />
        </div>
        <p className="text-sm font-medium text-ink">No se pudo cargar el formulario</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          Reintentar
        </Button>
      </div>
    );
  }

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
            <h1 className="text-heading-lg font-medium text-ink">Nueva reposición</h1>
            <p className="text-xs text-ink-mute">
              Registra la compra al proveedor; el stock se suma al confirmar la recepción.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <Button type="button" variant="secondary" onClick={volver}>
            Cancelar
          </Button>
          <Button type="button" isLoading={guardando} onClick={() => void guardar()}>
            <Save size={15} aria-hidden="true" />
            Guardar orden
          </Button>
        </div>
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

      <div className="grid grid-cols-1 gap-xl lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <main className="space-y-xl">
          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Datos de la orden</h2>
            <div className="grid gap-md sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="proveedor" className={labelClass}>
                  Proveedor *
                </label>
                <Select
                  value={proveedorId}
                  onChange={setProveedorId}
                  options={proveedorOptions}
                  aria-label="Proveedor de la orden"
                />
              </div>
              <div>
                <label htmlFor="arribo" className={labelClass}>
                  Arribo estimado
                </label>
                <Input
                  id="arribo"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="notas" className={labelClass}>
                  Notas
                </label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones de la compra, condiciones de pago, etc."
                  rows={2}
                />
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <div className="mb-md flex items-center justify-between gap-sm">
              <h2 className="text-heading-md font-medium text-ink">Productos</h2>
              <Button type="button" variant="secondary" size="sm" onClick={agregarLinea}>
                <Plus size={14} aria-hidden="true" />
                Agregar producto
              </Button>
            </div>

            {lineas.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-sm rounded-sm border border-dashed border-hairline py-lg text-center">
                <p className="text-sm text-ink-mute">Aún no agregaste productos a esta orden.</p>
                <Button type="button" variant="secondary" size="sm" onClick={agregarLinea}>
                  <Plus size={14} aria-hidden="true" />
                  Agregar el primero
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-hairline bg-canvas-soft">
                      {['Producto', 'Costo unitario', 'Cantidad', 'Subtotal'].map((label) => (
                        <th
                          key={label}
                          className="px-2 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute"
                        >
                          {label}
                        </th>
                      ))}
                      <th className="px-2 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-cool">
                    {lineas.map((linea) => (
                      <FilaLinea
                        key={linea.key}
                        linea={linea}
                        productos={productos}
                        puedeQuitar={lineas.length > 1}
                        onChange={(campo, valor) =>
                          dispatch({ type: 'editar', key: linea.key, campo, valor })
                        }
                        onQuitar={() => dispatch({ type: 'quitar', key: linea.key })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-lg">
          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Resumen</h2>
            <dl className="space-y-xs text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-mute">Líneas</dt>
                <dd className="font-mono tabular-nums text-ink">{lineas.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-mute">Unidades</dt>
                <dd className="font-mono tabular-nums text-ink">{totales.unidades}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-hairline pt-sm">
                <dt className="font-medium text-ink">Costo total</dt>
                <dd className="font-mono text-heading-md tabular-nums text-ink">
                  {formatearMonto(totales.costoTotal)}
                </dd>
              </div>
            </dl>
            <p className="mt-md text-[11px] text-ink-faint">
              La orden nace en estado Pendiente. El stock de la tienda no cambia hasta confirmar la recepción.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default NuevaReposicionPage;
