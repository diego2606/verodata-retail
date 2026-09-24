import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Layers, Plus, Trash2, Wand2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import { generarSkuSugerido, generarSkuEstructurado } from '../../lib/sku';
import { opcionesCategoriaJerarquicas, rutaCategoria } from '../../lib/categorias';
import type { CategoriaItem } from '../../types/category.types';
import type { AtributosVariante, CrearProductoPayload, ProductoItem } from '../../types/product.types';

const MAX_VARIANTES = 200;

const labelClass = 'block text-xs font-medium text-ink mb-xs';

const ATRIBUTO_CAMPOS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'COLOR', label: 'Color', placeholder: 'Negro, Blanco' },
  { key: 'SIZE', label: 'Talla', placeholder: '38, 40, 42' },
  { key: 'CAPACITY', label: 'Capacidad', placeholder: '1 L, 2 L' },
  { key: 'STORAGE_CAPACITY', label: 'Almacenamiento', placeholder: '128 GB, 256 GB' },
  { key: 'GENDER', label: 'Género', placeholder: 'Hombre, Mujer' },
  { key: 'LINE', label: 'Línea', placeholder: 'QuietComfort, Sport' },
  { key: 'MODEL', label: 'Modelo (código)', placeholder: 'AC5999, AC6000' },
];

const ATRIBUTO_LABELS: Record<string, string> = Object.fromEntries(
  ATRIBUTO_CAMPOS.map(c => [c.key, c.label])
);

interface FilaVariante {
  atributos: AtributosVariante;
  sku: string;
  precio_regular: string;
  stock_inicial: string;
}

/** Producto cartesiano de los grupos de valores. */
function productoCartesiano(grupos: Array<{ key: string; values: string[] }>): AtributosVariante[] {
  return grupos.reduce<AtributosVariante[]>((acc, grupo) => {
    const next: AtributosVariante[] = [];
    for (const combo of acc) {
      for (const value of grupo.values) {
        next.push({ ...combo, [grupo.key]: value });
      }
    }
    return next;
  }, [{}]);
}

function resumenAtributos(atributos: AtributosVariante): string {
  return Object.entries(atributos)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${ATRIBUTO_LABELS[key] ?? key}: ${value}`)
    .join(' · ');
}

interface MatrizVariantesModalProps {
  onClose: () => void;
  onCreated: (message: string) => void;
}

/**
 * HU028: alta masiva por matriz de variantes. Genera el producto cartesiano
 * de los valores ingresados y crea todas las variantes en una sola transacción.
 */
export function MatrizVariantesModal({
  onClose,
  onCreated,
}: MatrizVariantesModalProps): React.ReactElement {
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [categoriasStatus, setCategoriasStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categoriaId, setCategoriaId] = useState('');
  const [nombreBase, setNombreBase] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [modelo, setModelo] = useState('');
  const [precioRegular, setPrecioRegular] = useState('');
  const [precioOferta, setPrecioOferta] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [stockInicial, setStockInicial] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('5');

  const [valores, setValores] = useState<Record<string, string>>({});
  const [filas, setFilas] = useState<FilaVariante[]>([]);

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

  const categoriaSeleccionada = categorias.find(c => String(c.id) === categoriaId);

  const plantillaSku = useMemo(
    () => categoriaSeleccionada?.sku_segmentos ?? [],
    [categoriaSeleccionada]
  );
  const usaPlantilla = plantillaSku.length > 0;
  const requeridosSku = useMemo(
    () => plantillaSku.filter(token => token !== 'CATEGORIA'),
    [plantillaSku]
  );

  // HU029: mostrar solo los atributos definidos/heredados por la categoría,
  // manteniendo visibles los que ya tengan valores escritos.
  const camposVisibles = useMemo(() => {
    const sugeridos = categoriaSeleccionada?.atributos_sugeridos ?? [];
    const base =
      sugeridos.length === 0
        ? ATRIBUTO_CAMPOS
        : ATRIBUTO_CAMPOS.filter(c => sugeridos.includes(c.key));
    const extras = ATRIBUTO_CAMPOS.filter(
      c => !base.some(b => b.key === c.key) && (valores[c.key] ?? '').trim() !== ''
    );
    return [...base, ...extras];
  }, [categoriaSeleccionada, valores]);

  const grupoValores = useMemo(
    () =>
      Object.entries(valores)
        .map(([key, raw]) => ({
          key,
          values: raw
            .split(',')
            .map(v => v.trim())
            .filter(Boolean),
        }))
        .filter(g => g.values.length > 0),
    [valores]
  );

  const totalCombinaciones = useMemo(
    () => grupoValores.reduce((acc, g) => acc * g.values.length, grupoValores.length ? 1 : 0),
    [grupoValores]
  );

  const generar = useCallback((): void => {
    setServerError(null);
    if (grupoValores.length === 0) {
      setServerError('Ingresa al menos un atributo con uno o más valores (separados por coma).');
      return;
    }
    if (totalCombinaciones > MAX_VARIANTES) {
      setServerError(`La matriz genera ${totalCombinaciones} variantes; el máximo es ${MAX_VARIANTES}.`);
      return;
    }
    if (usaPlantilla) {
      const faltantes = requeridosSku.filter(token => !grupoValores.some(g => g.key === token));
      if (faltantes.length > 0) {
        setServerError(`Completa los atributos obligatorios del SKU: ${faltantes.join(', ')}.`);
        return;
      }
    }

    const combos = productoCartesiano(grupoValores);
    const usados = new Set<string>();
    const nuevas = combos.map(combo => {
      let sku = usaPlantilla
        ? generarSkuEstructurado(plantillaSku, categoriaSeleccionada?.sku_prefijo, combo)
        : generarSkuSugerido({
            categoria: categoriaSeleccionada?.nombre,
            modelo,
            atributos: combo,
          });
      if (usados.has(sku)) sku = `${sku}-${usados.size + 1}`.slice(0, 50);
      usados.add(sku);
      return { atributos: combo, sku, precio_regular: precioRegular, stock_inicial: stockInicial };
    });
    setFilas(nuevas);
  }, [
    grupoValores,
    totalCombinaciones,
    categoriaSeleccionada,
    modelo,
    precioRegular,
    stockInicial,
    usaPlantilla,
    requeridosSku,
    plantillaSku,
  ]);

  const actualizarFila = useCallback(
    (indice: number, cambios: Partial<FilaVariante>): void => {
      setFilas(prev => prev.map((fila, i) => (i === indice ? { ...fila, ...cambios } : fila)));
    },
    []
  );

  const eliminarFila = useCallback((indice: number): void => {
    setFilas(prev => prev.filter((_, i) => i !== indice));
  }, []);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setServerError(null);

    const errores: string[] = [];
    if (!categoriaId) errores.push('Selecciona una categoría.');
    if (nombreBase.trim().length < 2) errores.push('El nombre base debe tener al menos 2 caracteres.');
    if (descripcion.trim().length < 1) errores.push('La descripción es obligatoria.');
    if (filas.length === 0) errores.push('Genera las combinaciones antes de crear.');
    if (Number(precioOferta) > 0 && Number(precioOferta) >= Number(precioRegular)) {
      errores.push('El precio de oferta debe ser menor que el precio regular.');
    }
    for (const fila of filas) {
      if (fila.sku.trim().length < 3) errores.push(`SKU inválido en ${resumenAtributos(fila.atributos) || 'la fila'}.`);
      if (!(Number(fila.precio_regular) > 0)) errores.push(`Precio inválido en ${resumenAtributos(fila.atributos) || 'la fila'}.`);
    }
    const skus = filas.map(f => f.sku.trim().toUpperCase());
    if (!usaPlantilla && new Set(skus).size !== skus.length) {
      errores.push('Hay SKUs repetidos en la matriz.');
    }

    if (errores.length > 0) {
      setServerError(errores[0]);
      return;
    }

    const productos: CrearProductoPayload[] = filas.map(fila => ({
      categoria_id: Number(categoriaId),
      sku: usaPlantilla ? undefined : fila.sku.trim(),
      nombre: nombreBase.trim(),
      descripcion: descripcion.trim(),
      precio_regular: Number(fila.precio_regular),
      precio_oferta: Number(precioOferta) > 0 ? Number(precioOferta) : undefined,
      imagen_url: imagenUrl.trim() ? imagenUrl.trim() : undefined,
      modelo: modelo.trim() ? modelo.trim() : undefined,
      atributos: fila.atributos,
      stock_inicial: Number(stockInicial) || 0,
      stock_minimo: Number(stockMinimo) || 0,
    }));

    setIsSubmitting(true);
    try {
      const json = await apiClient.post<ProductoItem[]>('/api/v1/products/bulk', { productos });
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onCreated(`${json.data.length} variantes creadas correctamente`);
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriaOptions: SelectOption[] = useMemo(
    () => opcionesCategoriaJerarquicas(categorias),
    [categorias]
  );

  return (
    <Modal onClose={onClose} labelledBy="matriz-variantes-titulo" panelClassName="max-w-3xl">
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Layers size={16} className="text-primary-ink" aria-hidden="true" />
          <h2 id="matriz-variantes-titulo" className="text-sm font-medium text-ink">
            Matriz de variantes
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

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="m-categoria" className={labelClass}>
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
              <Select
                id="m-categoria"
                value={categoriaId}
                onChange={setCategoriaId}
                placeholder="Seleccionar categoría"
                options={categoriaOptions}
              />
            )}
          </div>
          <div>
            <label htmlFor="m-modelo" className={labelClass}>
              Modelo (familia)
            </label>
            <Input
              id="m-modelo"
              placeholder="Nike Air Force 1"
              value={modelo}
              onChange={e => setModelo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="m-nombre" className={labelClass}>
            Nombre base
          </label>
          <Input
            id="m-nombre"
            placeholder="Zapatilla running"
            value={nombreBase}
            onChange={e => setNombreBase(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="m-descripcion" className={labelClass}>
            Descripción
          </label>
          <Textarea
            id="m-descripcion"
            placeholder="Detalle del artículo…"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-md">
          <div>
            <label htmlFor="m-precio" className={labelClass}>
              Precio regular (S/)
            </label>
            <Input
              id="m-precio"
              type="number"
              step="0.01"
              min="0"
              className="tabular-nums"
              placeholder="199.90"
              value={precioRegular}
              onChange={e => setPrecioRegular(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="m-oferta" className={labelClass}>
              Precio oferta (S/)
            </label>
            <Input
              id="m-oferta"
              type="number"
              step="0.01"
              min="0"
              className="tabular-nums"
              placeholder="Opcional"
              value={precioOferta}
              onChange={e => setPrecioOferta(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="m-imagen" className={labelClass}>
              URL de imagen
            </label>
            <Input
              id="m-imagen"
              placeholder="https://…"
              value={imagenUrl}
              onChange={e => setImagenUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="m-stock" className={labelClass}>
              Stock inicial por variante
            </label>
            <Input
              id="m-stock"
              type="number"
              step="1"
              min="0"
              className="tabular-nums"
              value={stockInicial}
              onChange={e => setStockInicial(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="m-minimo" className={labelClass}>
              Stock mínimo
            </label>
            <Input
              id="m-minimo"
              type="number"
              step="1"
              min="0"
              className="tabular-nums"
              value={stockMinimo}
              onChange={e => setStockMinimo(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="rounded-sm border border-hairline-cool bg-canvas-soft p-sm">
          <legend className="px-xs text-xs font-medium text-ink">Valores por atributo</legend>
          <p className="mb-sm text-xs text-ink-mute">
            Escribe los valores separados por coma. Solo se usan los atributos con valores.
          </p>
          <div className="grid grid-cols-2 gap-md">
            {camposVisibles.map(campo => (
              <div key={campo.key}>
                <label htmlFor={`m-atributo-${campo.key}`} className={labelClass}>
                  {campo.label}
                </label>
                <Input
                  id={`m-atributo-${campo.key}`}
                  placeholder={
                    categoriaSeleccionada?.valores_sugeridos?.[campo.key]?.join(', ') ??
                    campo.placeholder
                  }
                  value={valores[campo.key] ?? ''}
                  onChange={e => setValores(prev => ({ ...prev, [campo.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-md flex items-center justify-between gap-sm">
            <p className="text-xs text-ink-mute">
              {categoriaSeleccionada
                ? `Atributos de ${rutaCategoria(categorias, categoriaSeleccionada.id)}`
                : 'Selecciona una categoría para ver sus atributos'}
            </p>
            <div className="flex items-center gap-sm">
              <p className="text-xs text-ink-mute">
                {totalCombinaciones > 0
                  ? `${totalCombinaciones} combinación${totalCombinaciones === 1 ? '' : 'es'}`
                  : 'Sin combinaciones'}
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={generar}>
                <Wand2 size={12} aria-hidden="true" />
                Generar combinaciones
              </Button>
            </div>
          </div>
        </fieldset>

        {filas.length > 0 && (
          <div className="overflow-hidden rounded-sm border border-hairline">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-canvas-soft">
                  <tr className="border-b border-hairline">
                    <th className="px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                      Variante
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                      Precio
                    </th>
                    <th className="px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                      Stock
                    </th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-cool">
                  {filas.map((fila, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-xs text-ink-secondary">
                        {resumenAtributos(fila.atributos) || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={fila.sku}
                          onChange={e => actualizarFila(i, { sku: e.target.value.toUpperCase() })}
                          className="h-8 font-mono text-xs"
                          aria-label={`SKU de la variante ${i + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={fila.precio_regular}
                          onChange={e => actualizarFila(i, { precio_regular: e.target.value })}
                          className="h-8 w-24 text-xs tabular-nums"
                          aria-label={`Precio de la variante ${i + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={fila.stock_inicial}
                          onChange={e => actualizarFila(i, { stock_inicial: e.target.value })}
                          className="h-8 w-20 text-xs tabular-nums"
                          aria-label={`Stock de la variante ${i + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarFila(i)}
                          aria-label={`Quitar variante ${i + 1}`}
                          className={cn('text-retail-red hover:bg-retail-red/10')}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={categoriasStatus !== 'ready' || filas.length === 0}
          >
            <Plus size={13} aria-hidden="true" />
            {isSubmitting ? 'Creando…' : `Crear ${filas.length || ''} variante${filas.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default MatrizVariantesModal;
