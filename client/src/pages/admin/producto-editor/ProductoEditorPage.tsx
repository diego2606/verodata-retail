import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { productModelsApi } from '../../../lib/productModelsApi';
import { apiClient, ApiClientError } from '../../../lib/apiClient';
import { opcionesCategoriaJerarquicas } from '../../../lib/categorias';
import { ProductImagesGallery } from '../../../components/products/ProductImagesGallery';
import type { CategoriaItem } from '../../../types/category.types';
import type {
  AtributoCategoriaItem,
  CrearModeloPayload,
  ModeloDraft,
  VarianteDraft,
} from '../../../types/productModel.types';
import { calcularDelta, deltaVacio } from './calcularDelta';
import { varianteDesdeSku, variantesReducer } from './variantesReducer';
import { VariantesTable } from './VariantesTable';

const labelClass = 'block text-xs font-medium text-ink mb-xs';

function CampoTexto({
  id,
  label,
  value,
  onChange,
  placeholder,
  onBlur,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  onBlur?: () => void;
  invalid?: boolean;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        invalid={invalid}
      />
    </div>
  );
}

const DRAFT_INICIAL: ModeloDraft = {
  categoria_id: null,
  nombre: '',
  marca: '',
  modelo_codigo: '',
  descripcion: '',
  atributos_variantes: [],
  activo: true,
};

interface ProductoEditorPageProps {
  modo: 'crear' | 'editar';
}

/**
 * Vista full-screen de Crear/Editar Producto (Modelo + variantes). Reemplaza los
 * antiguos modales (HU035). Layout de 2 columnas 70/30 dentro del Backoffice.
 */
export function ProductoEditorPage({ modo }: ProductoEditorPageProps): React.ReactElement {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [modeloDraft, setModeloDraft] = useState<ModeloDraft>(DRAFT_INICIAL);
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [variantes, dispatch] = useReducer(variantesReducer, [] as VarianteDraft[]);
  const [originales, setOriginales] = useState<VarianteDraft[]>([]);
  const [atributos, setAtributos] = useState<AtributoCategoriaItem[]>([]);

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(modo === 'editar' ? 'loading' : 'ready');
  const [reloadKey, setReloadKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const setCampo = useCallback(<K extends keyof ModeloDraft>(campo: K, valor: ModeloDraft[K]): void => {
    setModeloDraft((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  // Categorías (con jerarquía para el selector)
  useEffect(() => {
    let active = true;
    apiClient
      .get<CategoriaItem[]>('/api/v1/categories')
      .then((json) => {
        if (active && json.success) setCategorias(json.data);
      })
      .catch(() => {
        // El selector queda vacío; el error se muestra al intentar guardar.
      });
    return () => {
      active = false;
    };
  }, []);

  // Carga inicial en modo edición (el :id es el ID de un SKU del listado)
  useEffect(() => {
    if (modo !== 'editar' || !id) return;
    let active = true;
    setStatus('loading');
    setError(null);

    productModelsApi
      .obtenerPorSku(id)
      .then((json) => {
        if (!active) return;
        if (!json.success) {
          setError(json.error.message);
          setStatus('error');
          return;
        }
        const { variantes: skus, ...modelo } = json.data;
        setModeloId(modelo.id);
        setModeloDraft({
          categoria_id: modelo.categoria_id,
          nombre: modelo.nombre,
          marca: modelo.marca ?? '',
          modelo_codigo: modelo.modelo_codigo ?? '',
          descripcion: modelo.descripcion ?? '',
          atributos_variantes: modelo.atributos_variantes,
          activo: modelo.activo,
        });
        const filas = skus.map(varianteDesdeSku);
        dispatch({ type: 'cargar', variantes: filas });
        setOriginales(filas);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof ApiClientError ? e.message : 'No se pudo cargar el producto');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [modo, id, reloadKey]);

  // Atributos efectivos de la categoría (ejes habilitados)
  useEffect(() => {
    if (modeloDraft.categoria_id === null) {
      setAtributos([]);
      return;
    }
    let active = true;
    productModelsApi
      .atributosCategoria(modeloDraft.categoria_id)
      .then((json) => {
        if (!active) return;
        if (!json.success) {
          setAtributos([]);
          return;
        }
        setAtributos(json.data);
        setModeloDraft((prev) =>
          prev.atributos_variantes.length === 0
            ? { ...prev, atributos_variantes: json.data.map((a) => a.codigo) }
            : prev
        );
      })
      .catch(() => {
        if (active) setAtributos([]);
      });
    return () => {
      active = false;
    };
  }, [modeloDraft.categoria_id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const categoriaOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Selecciona una categoría' },
      ...opcionesCategoriaJerarquicas(categorias),
    ],
    [categorias]
  );

  const guardar = useCallback(async (): Promise<void> => {
    if (modeloDraft.categoria_id === null) {
      setError('Selecciona una categoría.');
      return;
    }
    if (modeloDraft.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    const payload: CrearModeloPayload = {
      categoria_id: modeloDraft.categoria_id,
      nombre: modeloDraft.nombre.trim(),
      marca: modeloDraft.marca.trim() || null,
      modelo_codigo: modeloDraft.modelo_codigo.trim() || null,
      descripcion: modeloDraft.descripcion.trim() || null,
      atributos_variantes: modeloDraft.atributos_variantes,
      activo: modeloDraft.activo,
    };
    const delta = calcularDelta(originales, variantes);

    setGuardando(true);
    setError(null);
    try {
      let destinoId = modeloId;
      if (destinoId) {
        const actualizado = await productModelsApi.actualizar(destinoId, payload);
        if (!actualizado.success) {
          setError(actualizado.error.message);
          return;
        }
      } else {
        const creado = await productModelsApi.crear(payload);
        if (!creado.success) {
          setError(creado.error.message);
          return;
        }
        destinoId = creado.data.id;
      }

      let primerSkuId: string | null = null;
      if (!deltaVacio(delta)) {
        const resumen = await productModelsApi.aplicarDelta(destinoId, delta);
        if (!resumen.success) {
          setError(resumen.error.message);
          return;
        }
        setToast(
          `Guardado: ${resumen.data.creadas} nueva(s), ${resumen.data.actualizadas} actualizada(s), ${resumen.data.desactivadas} desactivada(s).`
        );
        const filas = resumen.data.variantes.map(varianteDesdeSku);
        dispatch({ type: 'cargar', variantes: filas });
        setOriginales(filas);
        primerSkuId = resumen.data.variantes[0]?.id ?? null;
      } else {
        setToast('Cambios guardados.');
      }

      // Tras crear, pasamos al modo edición (con un SKU real) para seguir
      // gestionando imágenes o variantes sin salir de la ficha.
      if (!modeloId) {
        setModeloId(destinoId);
        if (primerSkuId) {
          void navigate(`/admin/products/${primerSkuId}/edit`, { replace: true });
          setReloadKey((k) => k + 1);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof ApiClientError ? e.message : 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }, [modeloDraft, originales, variantes, modeloId, navigate]);

  const volver = useCallback((): void => {
    void navigate('/admin/products');
  }, [navigate]);

  const titulo = modo === 'editar' ? 'Editar producto' : 'Nuevo producto';

  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Cargando producto" className="space-y-md">
        <div className="h-6 w-48 rounded-full bg-hairline-cool animate-pulse" />
        <div className="grid gap-xl lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <div className="h-64 rounded-sm border border-hairline bg-canvas" />
          <div className="h-40 rounded-sm border border-hairline bg-canvas" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-md px-lg py-huge text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-retail-red/20 bg-retail-red/5" aria-hidden="true">
          <AlertTriangle size={18} className="text-retail-red" />
        </div>
        <p className="text-sm font-medium text-ink">{error ?? 'No se pudo cargar el producto'}</p>
        <div className="flex gap-sm">
          <Button type="button" variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Reintentar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={volver}>
            Volver al catálogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Barra superior de acciones */}
      <div className="mb-xl flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={volver}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-sm border border-hairline text-ink-mute',
              'transition-colors hover:bg-hairline-cool hover:text-ink',
              'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'
            )}
            aria-label="Volver al catálogo"
          >
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-heading-lg font-medium text-ink">{titulo}</h1>
            <p className="text-xs text-ink-mute">
              Producto padre (modelo) y sus variantes (SKU) con stock propio.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <Button type="button" variant="secondary" onClick={volver}>
            Cancelar
          </Button>
          <Button type="button" isLoading={guardando} onClick={() => void guardar()}>
            <Save size={15} aria-hidden="true" />
            Guardar cambios
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="mb-md rounded-sm border border-retail-red/30 bg-retail-red/5 px-sm py-xs text-xs text-retail-red">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-xl lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        {/* Columna principal (70%) */}
        <main className="space-y-xl">
          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Datos básicos</h2>
            <div className="grid gap-md sm:grid-cols-2">
              <div className="sm:col-span-2">
                <CampoTexto
                  id="nombre"
                  label="Nombre base *"
                  value={modeloDraft.nombre}
                  onChange={(v) => setCampo('nombre', v)}
                  placeholder="Ej. Zapatilla Runner Pro"
                  invalid={error !== null && modeloDraft.nombre.trim().length < 2}
                />
              </div>
              <CampoTexto
                id="marca"
                label="Marca"
                value={modeloDraft.marca}
                onChange={(v) => setCampo('marca', v)}
                placeholder="Ej. Nike"
              />
              <CampoTexto
                id="modelo_codigo"
                label="Código de modelo"
                value={modeloDraft.modelo_codigo}
                onChange={(v) => setCampo('modelo_codigo', v)}
                placeholder="Ej. RNP-2026"
              />
              <div className="sm:col-span-2">
                <label htmlFor="descripcion" className={labelClass}>
                  Descripción
                </label>
                <Textarea
                  id="descripcion"
                  value={modeloDraft.descripcion}
                  onChange={(e) => setCampo('descripcion', e.target.value)}
                  placeholder="Descripción comercial del producto…"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Categoría y atributos</h2>
            <div className="max-w-md">
              <label htmlFor="categoria" className={labelClass}>
                Categoría *
              </label>
              <Select
                value={modeloDraft.categoria_id === null ? '' : String(modeloDraft.categoria_id)}
                onChange={(valor) => {
                  setCampo('categoria_id', valor === '' ? null : Number(valor));
                  setCampo('atributos_variantes', []);
                }}
                options={categoriaOptions}
                aria-label="Categoría del producto"
              />
            </div>

            {modeloDraft.categoria_id !== null && (
              <div className="mt-md">
                <p className="text-xs text-ink-mute">Ejes de variante habilitados por la categoría:</p>
                <div className="mt-xs flex flex-wrap gap-xs">
                  {atributos.length === 0 ? (
                    <span className="text-xs text-ink-faint">Esta categoría no tiene atributos ligados.</span>
                  ) : (
                    atributos.map((a) => (
                      <span
                        key={a.codigo}
                        className={cn(
                          'rounded-full border px-sm py-xxs text-xs leading-none',
                          modeloDraft.atributos_variantes.includes(a.codigo)
                            ? 'border-primary/30 bg-primary/10 text-primary-ink'
                            : 'border-hairline bg-canvas-soft text-ink-mute'
                        )}
                      >
                        {a.nombre}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Variantes e inventario</h2>
            <VariantesTable
              variantes={variantes}
              atributos={atributos}
              deshabilitado={modeloDraft.categoria_id === null || atributos.length === 0}
              onAgregar={(key, vals, campos) =>
                dispatch({ type: 'agregar', key, atributos: vals, campos })
              }
              onEditar={(key, campo, valor) => dispatch({ type: 'editar', key, campo, valor })}
              onToggleActivo={(key) => dispatch({ type: 'toggleActivo', key })}
              onMarcarEliminar={(key) => dispatch({ type: 'marcarEliminar', key })}
              onRestaurar={(key) => dispatch({ type: 'restaurar', key })}
            />
          </section>
        </main>

        {/* Panel lateral (30%) */}
        <aside className="space-y-lg">
          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Estado</h2>
            <div className="flex items-center justify-between gap-sm">
              <span id="estado-producto-label" className="text-sm text-ink">
                Visible en la tienda
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={modeloDraft.activo}
                aria-labelledby="estado-producto-label"
                onClick={() => setCampo('activo', !modeloDraft.activo)}
                className={cn(
                  'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
                  modeloDraft.activo ? 'bg-primary' : 'bg-hairline-strong'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-canvas transition-transform duration-150',
                    modeloDraft.activo ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </section>

          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Resumen</h2>
            <dl className="space-y-xs text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-mute">Variantes</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {variantes.filter((v) => v.estado !== 'eliminada').length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-mute">Stock total</dt>
                <dd className="font-mono tabular-nums text-ink">
                  {variantes
                    .filter((v) => v.estado !== 'eliminada')
                    .reduce((acc, v) => acc + v.stock_actual, 0)}
                </dd>
              </div>
            </dl>
            {modo === 'editar' && (
              <p className="mt-md text-[11px] text-ink-faint">
                El SKU y los atributos de cada variante son inmutables. Para cambiar de color o talla,
                desactiva la variante y crea una nueva.
              </p>
            )}
          </section>

          <section className="rounded-sm border border-hairline bg-canvas p-lg">
            <h2 className="mb-md text-heading-md font-medium text-ink">Imágenes generales</h2>
            {modeloId ? (
              <ProductImagesGallery
                productoId={modeloId}
                basePath={`/api/v1/product-models/${modeloId}/images`}
              />
            ) : (
              <p className="text-xs text-ink-mute">
                Guarda el producto para gestionar su galería de imágenes.
              </p>
            )}
          </section>
        </aside>
      </div>

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
    </div>
  );
}

export default ProductoEditorPage;
