import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Wand2,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import { AdjustStockModal } from '../../components/inventory/AdjustStockModal';
import { MatrizVariantesModal } from '../../components/products/MatrizVariantesModal';
import { ProductImagesGallery } from '../../components/products/ProductImagesGallery';
import { generarSkuSugerido, generarSkuEstructurado } from '../../lib/sku';
import { opcionesCategoriaJerarquicas, rutaCategoria } from '../../lib/categorias';
import type { CategoriaItem } from '../../types/category.types';
import type {
  ActualizarProductoPayload,
  AtributosVariante,
  CrearProductoPayload,
  ProductoItem,
} from '../../types/product.types';

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
};

type CampoAtributoForm =
  | 'color'
  | 'talla'
  | 'capacidad'
  | 'almacenamiento'
  | 'genero'
  | 'linea'
  | 'modeloCodigo'
  | 'marca';

interface AtributoCampo {
  key: string;
  label: string;
  placeholder: string;
  form: CampoAtributoForm;
}

/** Campos de atributo disponibles en el formulario (claves del whitelist del backend). */
const ATRIBUTO_CAMPOS: AtributoCampo[] = [
  { key: 'COLOR', label: 'Color', placeholder: 'Negro', form: 'color' },
  { key: 'SIZE', label: 'Talla', placeholder: '42', form: 'talla' },
  { key: 'CAPACITY', label: 'Capacidad', placeholder: '1 L', form: 'capacidad' },
  { key: 'STORAGE_CAPACITY', label: 'Almacenamiento', placeholder: '128 GB', form: 'almacenamiento' },
  { key: 'GENDER', label: 'Género', placeholder: 'Unisex', form: 'genero' },
  { key: 'LINE', label: 'Línea', placeholder: 'QuietComfort', form: 'linea' },
  { key: 'MODEL', label: 'Modelo (código)', placeholder: 'AC5999', form: 'modeloCodigo' },
  { key: 'BRAND', label: 'Marca', placeholder: 'Apple', form: 'marca' },
];

const ATRIBUTOS_SUGERIDOS_DEFAULT = ['COLOR', 'SIZE', 'CAPACITY'];

/** Campos a mostrar: los permitidos por la categoría + los que ya trae el producto. */
function camposVisibles(sugeridos: string[], clavesExistentes: string[]): AtributoCampo[] {
  return ATRIBUTO_CAMPOS.filter(
    campo => sugeridos.includes(campo.key) || clavesExistentes.includes(campo.key)
  );
}

/** Atributos no vacíos de una variante, con etiqueta legible. */
function listarAtributos(producto: ProductoItem): Array<{ label: string; value: string }> {
  return Object.entries(producto.atributos)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({ label: ATRIBUTO_LABELS[key] ?? key, value }));
}

/** Construye el mapa de atributos desde los campos del formulario (whitelist del backend). */
function construirAtributos(values: {
  color?: string;
  talla?: string;
  capacidad?: string;
  almacenamiento?: string;
  genero?: string;
  linea?: string;
  modeloCodigo?: string;
  marca?: string;
}): AtributosVariante {
  const atributos: AtributosVariante = {};
  if (values.color) atributos.COLOR = values.color;
  if (values.talla) atributos.SIZE = values.talla;
  if (values.capacidad) atributos.CAPACITY = values.capacidad;
  if (values.almacenamiento) atributos.STORAGE_CAPACITY = values.almacenamiento;
  if (values.genero) atributos.GENDER = values.genero;
  if (values.linea) atributos.LINE = values.linea;
  if (values.modeloCodigo) atributos.MODEL = values.modeloCodigo;
  if (values.marca) atributos.BRAND = values.marca;
  return atributos;
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

// ─── Schema del formulario (HU007) ────────────────────────────────────────────

const productoSchema = z
  .object({
    categoria_id: z.number().int().positive('Selecciona una categoría'),
    sku: z.string().trim().max(50).optional().or(z.literal('')),
    nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150),
    descripcion: z.string().trim().min(1, 'La descripción es obligatoria').max(1000),
    precio_regular: z
      .number({ invalid_type_error: 'Ingresa un precio válido' })
      .positive('El precio debe ser mayor a 0'),
    precio_oferta: z.preprocess(
      (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.number().positive('El precio de oferta debe ser mayor a 0').optional()
    ),
    imagen_url: z.string().trim().url('URL inválida').max(500).optional().or(z.literal('')),
    modelo: z.string().trim().max(255).optional().or(z.literal('')),
    color: z.string().trim().max(100).optional().or(z.literal('')),
    talla: z.string().trim().max(100).optional().or(z.literal('')),
    capacidad: z.string().trim().max(100).optional().or(z.literal('')),
    almacenamiento: z.string().trim().max(100).optional().or(z.literal('')),
    genero: z.string().trim().max(100).optional().or(z.literal('')),
    linea: z.string().trim().max(100).optional().or(z.literal('')),
    modeloCodigo: z.string().trim().max(100).optional().or(z.literal('')),
    marca: z.string().trim().max(100).optional().or(z.literal('')),
    stock_inicial: z.preprocess(
      v => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.number({ invalid_type_error: 'Ingresa un número' }).int('Debe ser un entero').min(0, 'No puede ser negativo').optional()
    ),
    stock_minimo: z.preprocess(
      v => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.number({ invalid_type_error: 'Ingresa un número' }).int('Debe ser un entero').min(0, 'No puede ser negativo').optional()
    ),
  })
  .refine((d) => d.precio_oferta === undefined || d.precio_oferta < d.precio_regular, {
    message: 'El precio de oferta debe ser menor que el precio regular',
    path: ['precio_oferta'],
  });

type ProductoFormValues = z.infer<typeof productoSchema>;

// ─── Schema de edición (HU008 — el SKU no se modifica) ────────────────────────

const editarProductoSchema = z
  .object({
    categoria_id: z.number().int().positive('Selecciona una categoría'),
    nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(150),
    descripcion: z.string().trim().min(1, 'La descripción es obligatoria').max(1000),
    precio_regular: z
      .number({ invalid_type_error: 'Ingresa un precio válido' })
      .positive('El precio debe ser mayor a 0'),
    precio_oferta: z.preprocess(
      (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.number().positive('El precio de oferta debe ser mayor a 0').optional()
    ),
    imagen_url: z.string().trim().url('URL inválida').max(500).optional().or(z.literal('')),
    modelo: z.string().trim().max(255).optional().or(z.literal('')),
    color: z.string().trim().max(100).optional().or(z.literal('')),
    talla: z.string().trim().max(100).optional().or(z.literal('')),
    capacidad: z.string().trim().max(100).optional().or(z.literal('')),
    almacenamiento: z.string().trim().max(100).optional().or(z.literal('')),
    genero: z.string().trim().max(100).optional().or(z.literal('')),
    linea: z.string().trim().max(100).optional().or(z.literal('')),
    modeloCodigo: z.string().trim().max(100).optional().or(z.literal('')),
    marca: z.string().trim().max(100).optional().or(z.literal('')),
  })
  .refine((d) => d.precio_oferta === undefined || d.precio_oferta < d.precio_regular, {
    message: 'El precio de oferta debe ser menor que el precio regular',
    path: ['precio_oferta'],
  });

type EditarProductoFormValues = z.infer<typeof editarProductoSchema>;

const ESTADO_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
];

const STOCK_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Todo el stock' },
  { value: 'solo', label: 'Solo stock bajo' },
];

const labelClass = 'block text-xs font-medium text-ink mb-xs';

function FieldError({ message }: { message?: string }): React.ReactElement | null {
  if (!message) return null;
  return (
    <p role="alert" aria-live="polite" className="mt-xs text-xs text-retail-red">
      {message}
    </p>
  );
}

function AtributoInput({
  id,
  label,
  placeholder,
  registration,
  sugerencias,
  onPick,
  requerido,
  deshabilitado,
}: {
  id: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  sugerencias?: string[];
  onPick?: (value: string) => void;
  requerido?: boolean;
  deshabilitado?: boolean;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {requerido && <span className="text-retail-red"> *</span>}
      </label>
      <Input id={id} placeholder={placeholder} disabled={deshabilitado} {...registration} />
      {!deshabilitado && sugerencias && sugerencias.length > 0 && onPick && (
        <div className="mt-xs flex flex-wrap gap-xs">
          {sugerencias.map(valor => (
            <Button
              key={valor}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onPick(valor)}
            >
              {valor}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

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

// ─── Modal de creación ────────────────────────────────────────────────────────

interface CreateProductModalProps {
  onClose: () => void;
  onCreated: (message: string) => void;
}

function CreateProductModal({ onClose, onCreated }: CreateProductModalProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [categoriasStatus, setCategoriasStatus] = useState<'loading' | 'ready' | 'error'>('loading');


  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
  });

  useEffect(() => {
    let active = true;
    apiClient
      .get<CategoriaItem[]>('/api/v1/categories?activo=true')
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setCategoriasStatus('error');
          return;
        }
        setCategorias(json.data);
        setCategoriasStatus('ready');
      })
      .catch(() => {
        if (active) setCategoriasStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (values: ProductoFormValues): Promise<void> => {
    setServerError(null);

    const atributos = construirAtributos(values);
    const usaPlantilla = (categoriaSeleccionada?.sku_segmentos ?? []).length > 0;
    if (!usaPlantilla && (!values.sku || values.sku.trim().length < 3)) {
      setServerError('El SKU es obligatorio (mínimo 3 caracteres).');
      return;
    }
    const payload: CrearProductoPayload = {
      categoria_id: values.categoria_id,
      sku: usaPlantilla ? undefined : values.sku?.trim(),
      nombre: values.nombre,
      descripcion: values.descripcion,
      precio_regular: values.precio_regular,
      precio_oferta: values.precio_oferta,
      imagen_url: values.imagen_url ? values.imagen_url : undefined,
      modelo: values.modelo ? values.modelo : undefined,
      atributos: Object.keys(atributos).length > 0 ? atributos : undefined,
      stock_inicial: values.stock_inicial,
      stock_minimo: values.stock_minimo,
    };

    try {
      const json = await apiClient.post<ProductoItem>('/api/v1/products', payload);
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onCreated(`Producto ${json.data.sku} creado`);
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    }
  };

  const categoriaOptions: SelectOption[] = opcionesCategoriaJerarquicas(categorias);

  const categoriaSeleccionada = categorias.find(c => c.id === watch('categoria_id'));
  const visibles = camposVisibles(
    categoriaSeleccionada?.atributos_sugeridos ?? ATRIBUTOS_SUGERIDOS_DEFAULT,
    []
  );
  const plantillaSku = categoriaSeleccionada?.sku_segmentos ?? [];
  const usaPlantilla = plantillaSku.length > 0;
  const requeridosSku = plantillaSku.filter(token => token !== 'CATEGORIA');
  const skuGenerado = usaPlantilla
    ? generarSkuEstructurado(
        plantillaSku,
        categoriaSeleccionada?.sku_prefijo,
        construirAtributos(watch())
      )
    : '';

  return (
    <Modal onClose={onClose} labelledBy="crear-producto-titulo" panelClassName="max-w-2xl">
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Package size={16} className="text-primary-ink" aria-hidden="true" />
          <h2 id="crear-producto-titulo" className="text-sm font-medium text-ink">
            Nuevo producto
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
        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="sku" className={labelClass}>
              SKU {usaPlantilla && <span className="text-ink-faint">(autogenerado)</span>}
            </label>
            {usaPlantilla ? (
              <Input
                id="sku"
                readOnly
                disabled
                value={skuGenerado || '—'}
                className="font-mono"
                aria-label="SKU autogenerado"
              />
            ) : (
              <div className="flex items-center gap-xs">
                <Input
                  id="sku"
                  invalid={!!errors.sku}
                  className="font-mono uppercase"
                  placeholder="ZAP-RUN-001"
                  {...register('sku')}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    setValue(
                      'sku',
                      generarSkuSugerido({
                        categoria: categoriaSeleccionada?.nombre,
                        modelo: watch('modelo'),
                        atributos: construirAtributos(watch()),
                      }),
                      { shouldValidate: true }
                    )
                  }
                >
                  <Wand2 size={12} aria-hidden="true" />
                  Generar
                </Button>
              </div>
            )}
            <FieldError message={errors.sku?.message} />
            {usaPlantilla && (
              <p className="mt-xs text-xs text-ink-mute">
                Se arma con la plantilla de la categoría (usa los atributos marcados con *).
              </p>
            )}
          </div>
          <div>
            <label htmlFor="categoria_id" className={labelClass}>
              Categoría
            </label>
            {categoriasStatus === 'loading' && (
              <div className="h-9 animate-pulse rounded-xs bg-hairline-cool" aria-busy="true" />
            )}
            {categoriasStatus === 'error' && (
              <p className="rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary">
                No se pudieron cargar las categorías.
              </p>
            )}
            {categoriasStatus === 'ready' && (
              <>
                <Controller
                  name="categoria_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="categoria_id"
                      value={field.value !== undefined ? String(field.value) : ''}
                      onChange={value => field.onChange(Number(value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="Seleccionar categoría"
                      options={categoriaOptions}
                      invalid={!!errors.categoria_id}
                    />
                  )}
                />
                <FieldError message={errors.categoria_id?.message} />
              </>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="nombre" className={labelClass}>
            Nombre
          </label>
          <Input id="nombre" invalid={!!errors.nombre} placeholder="Zapatilla running" {...register('nombre')} />
          <FieldError message={errors.nombre?.message} />
        </div>

        <div>
          <label htmlFor="descripcion" className={labelClass}>
            Descripción
          </label>
          <Textarea
            id="descripcion"
            invalid={!!errors.descripcion}
            placeholder="Detalle del artículo…"
            {...register('descripcion')}
          />
          <FieldError message={errors.descripcion?.message} />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="precio_regular" className={labelClass}>
              Precio regular (S/)
            </label>
            <Input
              id="precio_regular"
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.precio_regular}
              className="tabular-nums"
              placeholder="199.90"
              {...register('precio_regular', { valueAsNumber: true })}
            />
            <FieldError message={errors.precio_regular?.message} />
          </div>
          <div>
            <label htmlFor="precio_oferta" className={labelClass}>
              Precio oferta (S/) <span className="text-ink-faint">(opcional)</span>
            </label>
            <Input
              id="precio_oferta"
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.precio_oferta}
              className="tabular-nums"
              placeholder="149.90"
              {...register('precio_oferta', { valueAsNumber: true })}
            />
            <FieldError message={errors.precio_oferta?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="stock_inicial" className={labelClass}>
              Stock inicial
            </label>
            <Input
              id="stock_inicial"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              invalid={!!errors.stock_inicial}
              className="tabular-nums"
              placeholder="0"
              {...register('stock_inicial', { valueAsNumber: true })}
            />
            <FieldError message={errors.stock_inicial?.message} />
          </div>
          <div>
            <label htmlFor="stock_minimo" className={labelClass}>
              Stock mínimo
            </label>
            <Input
              id="stock_minimo"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              invalid={!!errors.stock_minimo}
              className="tabular-nums"
              placeholder="5"
              {...register('stock_minimo', { valueAsNumber: true })}
            />
            <FieldError message={errors.stock_minimo?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="imagen_url" className={labelClass}>
            URL de imagen <span className="text-ink-faint">(opcional)</span>
          </label>
          <Input
            id="imagen_url"
            invalid={!!errors.imagen_url}
            placeholder="https://…"
            {...register('imagen_url')}
          />
          <FieldError message={errors.imagen_url?.message} />
        </div>

        <fieldset className="rounded-sm border border-hairline-cool bg-canvas-soft p-sm">
          <legend className="px-xs text-xs font-medium text-ink">Variante (opcional)</legend>
          <div className="grid grid-cols-2 gap-md">
            <div className="col-span-2">
              <label htmlFor="modelo" className={labelClass}>
                Modelo (familia)
              </label>
              <Input id="modelo" placeholder="Nike Air Force 1" {...register('modelo')} />
              <p className="mt-xs text-xs text-ink-mute">
                Agrupa esta ficha con sus variantes de color, talla o capacidad.
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-ink-mute">
                {categoriaSeleccionada
                  ? `Atributos de ${rutaCategoria(categorias, categoriaSeleccionada.id)}`
                  : 'Selecciona una categoría para ver sus atributos'}
              </p>
            </div>
            {visibles.map(campo => (
              <AtributoInput
                key={campo.key}
                id={`atributo-${campo.form}`}
                label={campo.label}
                placeholder={campo.placeholder}
                registration={register(campo.form)}
                sugerencias={categoriaSeleccionada?.valores_sugeridos?.[campo.key]}
                onPick={valor => setValue(campo.form, valor, { shouldValidate: true })}
                requerido={usaPlantilla && requeridosSku.includes(campo.key)}
              />
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={categoriasStatus !== 'ready'}>
            {isSubmitting ? 'Creando…' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal de edición (HU008) ─────────────────────────────────────────────────

interface EditProductModalProps {
  producto: ProductoItem;
  onClose: () => void;
  onUpdated: (message: string) => void;
}

function EditProductModal({ producto, onClose, onUpdated }: EditProductModalProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [categoriasStatus, setCategoriasStatus] = useState<'loading' | 'ready' | 'error'>('loading');


  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarProductoFormValues>({
    resolver: zodResolver(editarProductoSchema),
    defaultValues: {
      categoria_id: producto.categoria_id,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      precio_regular: producto.precio_regular,
      precio_oferta: producto.precio_oferta ?? undefined,
      imagen_url: producto.imagen_url ?? '',
      modelo: producto.modelo ?? '',
      color: producto.atributos.COLOR ?? '',
      talla: producto.atributos.SIZE ?? '',
      capacidad: producto.atributos.CAPACITY ?? '',
      almacenamiento: producto.atributos.STORAGE_CAPACITY ?? '',
      genero: producto.atributos.GENDER ?? '',
      linea: producto.atributos.LINE ?? '',
      modeloCodigo: producto.atributos.MODEL ?? '',
    },
  });

  useEffect(() => {
    let active = true;
    apiClient
      .get<CategoriaItem[]>('/api/v1/categories')
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setCategoriasStatus('error');
          return;
        }
        setCategorias(json.data);
        setCategoriasStatus('ready');
      })
      .catch(() => {
        if (active) setCategoriasStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (values: EditarProductoFormValues): Promise<void> => {
    setServerError(null);

    const payload: ActualizarProductoPayload = {
      categoria_id: values.categoria_id,
      nombre: values.nombre,
      descripcion: values.descripcion,
      precio_regular: values.precio_regular,
      precio_oferta: values.precio_oferta ?? null,
      imagen_url: values.imagen_url ?? '',
      modelo: values.modelo ? values.modelo : null,
      atributos: construirAtributos(values),
    };

    try {
      const json = await apiClient.patch<ProductoItem>(`/api/v1/products/${producto.id}`, payload);
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onUpdated(`Producto ${json.data.sku} actualizado`);
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    }
  };

  const categoriaOptions: SelectOption[] = opcionesCategoriaJerarquicas(categorias);

  const categoriaSeleccionada = categorias.find(c => c.id === watch('categoria_id'));
  const visibles = camposVisibles(
    categoriaSeleccionada?.atributos_sugeridos ?? ATRIBUTOS_SUGERIDOS_DEFAULT,
    Object.keys(producto.atributos)
  );
  const plantillaSku = categoriaSeleccionada?.sku_segmentos ?? [];
  const usaPlantilla = plantillaSku.length > 0;
  const requeridosSku = plantillaSku.filter(token => token !== 'CATEGORIA');

  return (
    <Modal onClose={onClose} labelledBy="editar-producto-titulo" panelClassName="max-w-2xl">
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Pencil size={16} className="text-primary-ink" aria-hidden="true" />
          <h2 id="editar-producto-titulo" className="text-sm font-medium text-ink">
            Editar producto
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
        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="edit-sku" className={labelClass}>
              SKU
            </label>
            <Input id="edit-sku" value={producto.sku} readOnly disabled className="font-mono" />
          </div>
          <div>
            <label htmlFor="edit-categoria_id" className={labelClass}>
              Categoría
            </label>
            {categoriasStatus === 'loading' && (
              <div className="h-9 animate-pulse rounded-xs bg-hairline-cool" aria-busy="true" />
            )}
            {categoriasStatus === 'error' && (
              <p className="rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary">
                No se pudieron cargar las categorías.
              </p>
            )}
            {categoriasStatus === 'ready' && (
              <>
                <Controller
                  name="categoria_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="edit-categoria_id"
                      value={field.value !== undefined ? String(field.value) : ''}
                      onChange={value => field.onChange(Number(value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="Seleccionar categoría"
                      options={categoriaOptions}
                      invalid={!!errors.categoria_id}
                    />
                  )}
                />
                <FieldError message={errors.categoria_id?.message} />
              </>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="edit-nombre" className={labelClass}>
            Nombre
          </label>
          <Input id="edit-nombre" invalid={!!errors.nombre} {...register('nombre')} />
          <FieldError message={errors.nombre?.message} />
        </div>

        <div>
          <label htmlFor="edit-descripcion" className={labelClass}>
            Descripción
          </label>
          <Textarea id="edit-descripcion" invalid={!!errors.descripcion} {...register('descripcion')} />
          <FieldError message={errors.descripcion?.message} />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="edit-precio_regular" className={labelClass}>
              Precio regular (S/)
            </label>
            <Input
              id="edit-precio_regular"
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.precio_regular}
              className="tabular-nums"
              {...register('precio_regular', { valueAsNumber: true })}
            />
            <FieldError message={errors.precio_regular?.message} />
          </div>
          <div>
            <label htmlFor="edit-precio_oferta" className={labelClass}>
              Precio oferta (S/) <span className="text-ink-faint">(opcional)</span>
            </label>
            <Input
              id="edit-precio_oferta"
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.precio_oferta}
              className="tabular-nums"
              {...register('precio_oferta', { valueAsNumber: true })}
            />
            <FieldError message={errors.precio_oferta?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="edit-imagen_url" className={labelClass}>
            URL de imagen <span className="text-ink-faint">(opcional)</span>
          </label>
          <Input id="edit-imagen_url" invalid={!!errors.imagen_url} {...register('imagen_url')} />
          <FieldError message={errors.imagen_url?.message} />
        </div>

        <fieldset className="rounded-sm border border-hairline-cool bg-canvas-soft p-sm">
          <legend className="px-xs text-xs font-medium text-ink">Variante</legend>
          <div className="grid grid-cols-2 gap-md">
            <div className="col-span-2">
              <label htmlFor="edit-modelo" className={labelClass}>
                Modelo (familia)
              </label>
              <Input id="edit-modelo" placeholder="Nike Air Force 1" {...register('modelo')} />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-ink-mute">
                {categoriaSeleccionada
                  ? `Atributos de ${rutaCategoria(categorias, categoriaSeleccionada.id)}`
                  : 'Selecciona una categoría para ver sus atributos'}
              </p>
              {usaPlantilla && (
                <p className="mt-xs text-xs text-ink-mute">
                  El SKU es inmutable: los campos marcados con * están bloqueados. Para cambiarlos,
                  desactiva este producto y crea uno nuevo.
                </p>
              )}
            </div>
            {visibles.map(campo => (
              <AtributoInput
                key={campo.key}
                id={`edit-atributo-${campo.form}`}
                label={campo.label}
                placeholder={campo.placeholder}
                registration={register(campo.form)}
                sugerencias={categoriaSeleccionada?.valores_sugeridos?.[campo.key]}
                onPick={valor => setValue(campo.form, valor, { shouldValidate: true })}
                requerido={usaPlantilla && requeridosSku.includes(campo.key)}
                deshabilitado={usaPlantilla && requeridosSku.includes(campo.key)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-sm border border-hairline-cool bg-canvas-soft p-sm">
          <legend className="px-xs text-xs font-medium text-ink">Imágenes</legend>
          <p className="mb-sm text-xs text-ink-mute">
            La imagen principal es la que se muestra en el catálogo; las demás son vistas.
          </p>
          <ProductImagesGallery productoId={producto.id} />
        </fieldset>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={categoriasStatus !== 'ready'}>
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </Modal>
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
}

function GrupoRow({ grupo, expandido, onToggle }: GrupoRowProps): React.ReactElement {
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
        <div className="flex items-center justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onToggle}>
            {expandido ? 'Contraer' : 'Ver variantes'}
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

  const [showCreate, setShowCreate] = useState(false);
  const [showMatriz, setShowMatriz] = useState(false);
  const [editing, setEditing] = useState<ProductoItem | null>(null);
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

  const handleCreated = useCallback(
    (message: string): void => {
      setShowCreate(false);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const handleMatrizCreated = useCallback(
    (message: string): void => {
      setShowMatriz(false);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
  );

  const handleUpdated = useCallback(
    (message: string): void => {
      setEditing(null);
      setToast({ type: 'success', message });
      reload();
    },
    [reload]
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
            Artículos publicados en la tienda, con su precio y disponibilidad.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <Button type="button" variant="secondary" onClick={() => setShowMatriz(true)}>
            <Layers size={15} aria-hidden="true" />
            Matriz de variantes
          </Button>
          <Button type="button" onClick={() => setShowCreate(true)}>
            <Plus size={15} aria-hidden="true" />
            Nuevo producto
          </Button>
        </div>
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
          <EmptyState
            filtered={hayFiltros}
            onCreate={() => setShowCreate(true)}
            onClear={clearFilters}
          />
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
                      onEdit={setEditing}
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
                      />
                      {expandidos.has(grupo.key) &&
                        grupo.items.map(p => (
                          <ProductRow
                            key={p.id}
                            producto={p}
                            indent
                            onEdit={setEditing}
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

      {showCreate && (
        <CreateProductModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {showMatriz && (
        <MatrizVariantesModal onClose={() => setShowMatriz(false)} onCreated={handleMatrizCreated} />
      )}
      {editing && (
        <EditProductModal
          producto={editing}
          onClose={() => setEditing(null)}
          onUpdated={handleUpdated}
        />
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
