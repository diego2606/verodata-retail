import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CornerDownRight,
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
import { ATRIBUTO_KEYS, ATRIBUTO_LABELS, SKU_SEGMENTOS } from '../../lib/atributos';
import { generarSkuEstructurado } from '../../lib/sku';
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
  // '' = categoría raíz; string numérico = id del padre.
  categoria_padre_id: z.string(),
});

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

/** IDs de una categoría y todos sus descendientes (para no ofrecerse como padre). */
function idsConDescendientes(categorias: CategoriaItem[], raizId: number): Set<number> {
  const resultado = new Set<number>([raizId]);
  let agregado = true;
  while (agregado) {
    agregado = false;
    for (const c of categorias) {
      if (c.categoria_padre_id !== null && resultado.has(c.categoria_padre_id) && !resultado.has(c.id)) {
        resultado.add(c.id);
        agregado = true;
      }
    }
  }
  return resultado;
}

/** Ordena la lista plana en orden jerárquico (padre y luego hijos) con su profundidad. */
function ordenarJerarquia(categorias: CategoriaItem[]): Array<{ categoria: CategoriaItem; depth: number }> {
  const porPadre = new Map<number | null, CategoriaItem[]>();
  for (const c of categorias) {
    const key = c.categoria_padre_id;
    const lista = porPadre.get(key) ?? [];
    lista.push(c);
    porPadre.set(key, lista);
  }
  for (const lista of porPadre.values()) {
    lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
  }
  const salida: Array<{ categoria: CategoriaItem; depth: number }> = [];
  const visitados = new Set<number>();
  const recorrer = (padreId: number | null, depth: number): void => {
    for (const c of porPadre.get(padreId) ?? []) {
      if (visitados.has(c.id)) continue;
      visitados.add(c.id);
      salida.push({ categoria: c, depth });
      recorrer(c.id, depth + 1);
    }
  };
  recorrer(null, 0);
  // Categorías huérfanas (padre fuera del filtro actual)
  for (const c of categorias) {
    if (!visitados.has(c.id)) salida.push({ categoria: c, depth: 0 });
  }
  return salida;
}

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

const COLUMNS = ['Categoría', 'Slug', 'Productos', 'Estado'] as const;

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
  categorias: CategoriaItem[];
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

/** Atributos de ejemplo para previsualizar la plantilla de SKU. */
const SKU_EJEMPLO: Record<string, string> = {
  BRAND: 'Apple',
  MODEL: '15PM',
  STORAGE_CAPACITY: '256 GB',
  COLOR: 'Negro',
  SIZE: '42',
  CAPACITY: '1 L',
  GENDER: 'Hombre',
  LINE: 'Redmi',
};

/** Parsea "CATEGORIA, BRAND, MODEL" a tokens válidos, sin repetir ni vacíos. */
function parseSegmentos(texto: string): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const raw of texto.split(',')) {
    const token = raw.trim().toUpperCase();
    if (!token) continue;
    if (!(SKU_SEGMENTOS as readonly string[]).includes(token)) continue;
    if (vistos.has(token)) continue;
    vistos.add(token);
    out.push(token);
  }
  return out;
}

function CategoryModal({ categoria, categorias, onClose, onSaved }: CategoryModalProps): React.ReactElement {
  const editing = categoria !== null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [defineAtributos, setDefineAtributos] = useState(categoria?.atributos_permitidos != null);
  const [atributosSeleccionados, setAtributosSeleccionados] = useState<string[]>(
    categoria?.atributos_permitidos ?? []
  );
  const [valoresAtributos, setValoresAtributos] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(categoria?.atributos_valores ?? {}).map(([key, valores]) => [
        key,
        valores.join(', '),
      ])
    )
  );
  const [skuPrefijo, setSkuPrefijo] = useState(categoria?.sku_prefijo ?? '');
  const [skuSegmentosTexto, setSkuSegmentosTexto] = useState(
    (categoria?.sku_segmentos ?? []).join(', ')
  );

  const segmentosParseados = parseSegmentos(skuSegmentosTexto);
  const skuPreview =
    segmentosParseados.length > 0
      ? generarSkuEstructurado(segmentosParseados, skuPrefijo, SKU_EJEMPLO)
      : '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria?.nombre ?? '',
      slug: categoria?.slug ?? '',
      descripcion: categoria?.descripcion ?? '',
      categoria_padre_id: categoria?.categoria_padre_id != null ? String(categoria.categoria_padre_id) : '',
    },
  });

  const nombreValue = watch('nombre');
  const padreSeleccionadoId = watch('categoria_padre_id');

  const toggleAtributo = (key: string): void => {
    setAtributosSeleccionados(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Atributos heredados del padre seleccionado (efectivos ya resueltos por la API).
  const heredados = useMemo(() => {
    if (!padreSeleccionadoId) return null;
    return categorias.find(c => String(c.id) === padreSeleccionadoId)?.atributos_sugeridos ?? [];
  }, [categorias, padreSeleccionadoId]);

  // Opciones de padre: todas menos la categoría editada y sus descendientes (evita ciclos).
  // Se muestran en orden jerárquico e indentadas para distinguir categorías de subcategorías.
  const padreOptions: SelectOption[] = useMemo(() => {
    const excluir = editing && categoria ? idsConDescendientes(categorias, categoria.id) : new Set<number>();
    const opciones = ordenarJerarquia(categorias)
      .filter(({ categoria: c }) => !excluir.has(c.id))
      .map(({ categoria: c, depth }) => ({
        value: String(c.id),
        label: `${'— '.repeat(depth)}${c.nombre}`,
      }));
    return [{ value: '', label: '— Sin categoría padre (raíz) —' }, ...opciones];
  }, [categorias, editing, categoria]);

  // Auto-genera el slug desde el nombre mientras no se edite manualmente (CA02)
  useEffect(() => {
    if (!slugTouched) setValue('slug', slugify(nombreValue ?? ''));
  }, [nombreValue, slugTouched, setValue]);

  const onSubmit = async (values: CategoriaFormValues): Promise<void> => {
    setServerError(null);
    const slug = values.slug ? values.slug : undefined;
    const padreId = values.categoria_padre_id ? Number(values.categoria_padre_id) : null;

    // HU031: los atributos usados en la plantilla de SKU deben estar permitidos.
    const tokensAtributo = segmentosParseados.filter(t => t !== 'CATEGORIA');
    const atributosPermitidos = defineAtributos
      ? Array.from(new Set([...atributosSeleccionados, ...tokensAtributo]))
      : null;
    const skuPrefijoPayload = skuPrefijo.trim() ? skuPrefijo.trim().toUpperCase() : null;
    const skuSegmentosPayload = segmentosParseados.length > 0 ? segmentosParseados : null;

    const atributosValores: Record<string, string[]> | null = defineAtributos
      ? (() => {
          const out: Record<string, string[]> = {};
          for (const key of atributosSeleccionados) {
            const lista = (valoresAtributos[key] ?? '')
              .split(',')
              .map(v => v.trim())
              .filter(Boolean);
            if (lista.length > 0) out[key] = lista;
          }
          return out;
        })()
      : null;

    try {
      if (editing && categoria) {
        const payload: ActualizarCategoriaPayload = {
          nombre: values.nombre,
          slug,
          descripcion: values.descripcion ?? '',
          categoria_padre_id: padreId,
          atributos_permitidos: atributosPermitidos,
          atributos_valores: atributosValores,
          sku_prefijo: skuPrefijoPayload,
          sku_segmentos: skuSegmentosPayload,
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
          categoria_padre_id: padreId,
          atributos_permitidos: atributosPermitidos,
          atributos_valores: atributosValores,
          sku_prefijo: skuPrefijoPayload,
          sku_segmentos: skuSegmentosPayload,
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
      panelClassName="max-w-lg"
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
          <label htmlFor="categoria_padre_id" className={labelClass}>
            Categoría padre <span className="text-ink-faint">(opcional)</span>
          </label>
          <Controller
            name="categoria_padre_id"
            control={control}
            render={({ field }) => (
              <Select
                id="categoria_padre_id"
                value={field.value}
                onChange={field.onChange}
                options={padreOptions}
                aria-label="Categoría padre"
              />
            )}
          />
          <p className="mt-xs text-xs text-ink-mute">
            Déjalo en raíz para una categoría principal; elige una padre para crear una subcategoría.
          </p>
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

        <fieldset className="rounded-sm border border-hairline-cool bg-canvas-soft p-sm">
          <legend className="px-xs text-xs font-medium text-ink">Atributos de variante</legend>
          <div className="flex items-start justify-between gap-sm">
            <p className="text-xs text-ink-mute">
              Define qué atributos (color, talla, …) acepta esta categoría.
            </p>
            <Button
              type="button"
              variant={defineAtributos ? 'secondary' : 'primary'}
              size="sm"
              aria-pressed={defineAtributos}
              onClick={() => setDefineAtributos(v => !v)}
            >
              {defineAtributos ? 'Usar herencia' : 'Definir propios'}
            </Button>
          </div>
          {defineAtributos ? (
            <>
              <div className="mt-sm flex flex-wrap gap-xs">
                {ATRIBUTO_KEYS.map(key => {
                  const activo = atributosSeleccionados.includes(key);
                  return (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={activo ? 'primary' : 'secondary'}
                      aria-pressed={activo}
                      onClick={() => toggleAtributo(key)}
                    >
                      {ATRIBUTO_LABELS[key]}
                    </Button>
                  );
                })}
              </div>

              {atributosSeleccionados.length > 0 && (
                <div className="mt-sm space-y-xs">
                  <p className="text-xs text-ink-mute">
                    Valores sugeridos (se muestran como atajos al crear el producto):
                  </p>
                  {atributosSeleccionados.map(key => (
                    <div key={key} className="flex items-center gap-sm">
                      <span className="w-28 shrink-0 text-xs text-ink-mute">
                        {ATRIBUTO_LABELS[key]}
                      </span>
                      <Input
                        value={valoresAtributos[key] ?? ''}
                        onChange={e =>
                          setValoresAtributos(prev => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder="Separados por coma (ej. Negro, Blanco)"
                        aria-label={`Valores sugeridos para ${ATRIBUTO_LABELS[key]}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="mt-sm text-xs text-ink-mute">
              {heredados === null
                ? 'Sin categoría padre: se usarán los atributos sugeridos automáticamente.'
                : heredados.length > 0
                  ? `Hereda del padre: ${heredados.map(k => ATRIBUTO_LABELS[k] ?? k).join(', ')}.`
                  : 'El padre no define atributos; se usarán los sugeridos automáticamente.'}
            </p>
          )}
        </fieldset>

        <fieldset className="rounded-sm border border-hairline-cool bg-canvas-soft p-sm">
          <legend className="px-xs text-xs font-medium text-ink">SKU estructurado (opcional)</legend>
          <p className="text-xs text-ink-mute">
            Si defines prefijo y segmentos, el SKU se genera solo al crear productos de esta
            categoría (bloqueado).
          </p>
          <div className="mt-sm grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="sku-prefijo" className={labelClass}>
                Prefijo
              </label>
              <Input
                id="sku-prefijo"
                value={skuPrefijo}
                onChange={e => setSkuPrefijo(e.target.value.toUpperCase())}
                placeholder="TEC"
                maxLength={6}
                className="font-mono uppercase"
              />
            </div>
            <div>
              <label htmlFor="sku-segmentos" className={labelClass}>
                Segmentos (en orden)
              </label>
              <Input
                id="sku-segmentos"
                value={skuSegmentosTexto}
                onChange={e => setSkuSegmentosTexto(e.target.value)}
                placeholder="CATEGORIA, BRAND, MODEL"
                className="font-mono"
              />
            </div>
          </div>
          <p className="mt-xs text-xs text-ink-mute">Tokens válidos: {SKU_SEGMENTOS.join(', ')}</p>
          {skuPreview && (
            <p className="mt-xs text-xs text-ink-mute">
              Ejemplo:{' '}
              <span className="font-mono tabular-nums text-ink">{skuPreview}</span>
            </p>
          )}
        </fieldset>

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

  /** Mueve una categoría arriba/abajo dentro de sus hermanas (mismo padre). */
  const mover = useCallback(
    async (categoria: CategoriaItem, delta: number): Promise<void> => {
      const hermanas = categorias
        .filter(c => c.categoria_padre_id === categoria.categoria_padre_id)
        .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
      const i = hermanas.findIndex(c => c.id === categoria.id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= hermanas.length) return;

      const reordenadas = [...hermanas];
      const temporal = reordenadas[i];
      reordenadas[i] = reordenadas[j];
      reordenadas[j] = temporal;

      try {
        const json = await apiClient.patch<{ ids: number[] }>('/api/v1/categories/orden', {
          ids: reordenadas.map(c => c.id),
        });
        if (!json.success) {
          setToast({ type: 'error', message: json.error.message });
          return;
        }
        reload();
      } catch (error) {
        setToast({
          type: 'error',
          message: error instanceof ApiClientError ? error.message : 'Error al reordenar',
        });
      }
    },
    [categorias, reload]
  );

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

  const ordenadas = useMemo(() => ordenarJerarquia(categorias), [categorias]);
  const nombrePorId = useMemo(
    () => new Map(categorias.map(c => [c.id, c.nombre])),
    [categorias]
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
                {ordenadas.map(({ categoria: c, depth }) => (
                  <tr key={c.id} className="transition-colors duration-150 hover:bg-canvas-soft">
                    <td className="px-3 py-2.5 text-sm text-ink">
                      <div
                        className="flex items-center gap-sm"
                        style={{ paddingLeft: `${depth * 20}px` }}
                      >
                        {depth > 0 && (
                          <CornerDownRight
                            size={13}
                            className="shrink-0 text-ink-faint"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-ink">{c.nombre}</p>
                          {c.categoria_padre_id !== null && (
                            <p className="mt-xxs truncate text-xs text-ink-mute">
                              Subcategoría de {nombrePorId.get(c.categoria_padre_id) ?? '—'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-secondary">{c.slug}</td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-ink-mute">
                      {c.productos_count}
                      {c.hijos_count > 0 && (
                        <span className="ml-xs text-ink-faint">· {c.hijos_count} sub</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <EstadoBadge activo={c.activo} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-xs">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            void mover(c, -1);
                          }}
                          aria-label="Subir"
                          title="Subir"
                        >
                          <ArrowUp size={13} aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            void mover(c, 1);
                          }}
                          aria-label="Bajar"
                          title="Bajar"
                        >
                          <ArrowDown size={13} aria-hidden="true" />
                        </Button>
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
                          disabled={c.productos_count > 0 || c.hijos_count > 0}
                          title={
                            c.productos_count > 0
                              ? 'No se puede eliminar: tiene productos asociados. Desactívala.'
                              : c.hijos_count > 0
                                ? 'No se puede eliminar: tiene subcategorías. Elimínalas o muévelas primero.'
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
          categorias={categorias}
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
