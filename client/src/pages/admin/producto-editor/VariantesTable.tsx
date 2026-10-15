import React, { useState } from 'react';
import { Check, Lock, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select, type SelectOption } from '../../../components/ui/Select';
import type { AtributoCategoriaItem, VarianteDraft } from '../../../types/productModel.types';

const precioFmt = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

function formatearPrecio(valor: number | null): string {
  return valor === null ? '—' : precioFmt.format(valor);
}

/** Celda numérica editable (stock/int o precio/decimal). */
function NumeroCelda({
  value,
  onChange,
  ariaLabel,
  entero = true,
  disabled = false,
}: {
  value: number | null;
  onChange: (valor: number | null) => void;
  ariaLabel: string;
  entero?: boolean;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <Input
      type="number"
      inputMode={entero ? 'numeric' : 'decimal'}
      min={0}
      step={entero ? 1 : 0.01}
      value={value === null ? '' : String(value)}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange(null);
          return;
        }
        const num = Number(raw);
        if (Number.isNaN(num)) return;
        onChange(entero ? Math.trunc(num) : num);
      }}
      aria-label={ariaLabel}
      className="h-8 w-24 font-mono text-xs tabular-nums"
    />
  );
}

interface VarianteRowProps {
  variante: VarianteDraft;
  atributos: AtributoCategoriaItem[];
  onEditar: (key: string, campo: 'precio_regular' | 'precio_oferta' | 'stock_actual' | 'stock_minimo' | 'codigo_barras', valor: number | string | null) => void;
  onToggleActivo: (key: string) => void;
  onMarcarEliminar: (key: string) => void;
  onRestaurar: (key: string) => void;
}

function etiquetaAtributo(atributos: AtributoCategoriaItem[], codigo: string): string {
  return atributos.find((a) => a.codigo === codigo)?.nombre ?? codigo;
}

function VarianteRow({
  variante: v,
  atributos,
  onEditar,
  onToggleActivo,
  onMarcarEliminar,
  onRestaurar,
}: VarianteRowProps): React.ReactElement {
  const bloqueado = v.id !== null;
  const eliminada = v.estado === 'eliminada';

  return (
    <tr className={cn('transition-colors duration-150', eliminada ? 'opacity-50' : 'hover:bg-canvas-soft')}>
      {/* Atributos (bloqueados si el SKU ya existe) */}
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap items-center gap-xs">
          {Object.entries(v.atributos).map(([codigo, valor]) => (
            <span
              key={codigo}
              className="rounded-xs border border-hairline-cool bg-canvas-soft px-xs py-xxs text-[10px] leading-none text-ink-mute"
            >
              {etiquetaAtributo(atributos, codigo)}: <span className="text-ink">{valor}</span>
            </span>
          ))}
          {v.estado === 'nueva' && (
            <span className="rounded-full bg-primary px-xs py-xxs text-[10px] font-medium leading-none text-on-primary">
              Nueva variante
            </span>
          )}
        </div>
      </td>

      {/* SKU + código de barras (SKU bloqueado si existe) */}
      <td className="px-3 py-2 align-top">
        <div className="flex items-center gap-xs">
          {bloqueado && <Lock size={12} className="shrink-0 text-ink-faint" aria-hidden="true" />}
          <span
            className="font-mono text-xs text-ink"
            title={bloqueado ? 'El SKU y los atributos son inmutables.' : undefined}
          >
            {v.sku || (bloqueado ? '—' : 'Se genera al guardar')}
          </span>
        </div>
        <div className="mt-xs">
          <Input
            type="text"
            value={v.codigo_barras ?? ''}
            placeholder="Código de barras"
            onChange={(e) => onEditar(v.key, 'codigo_barras', e.target.value || null)}
            aria-label="Código de barras"
            className="h-8 w-40 font-mono text-xs"
          />
        </div>
      </td>

      {/* Stock */}
      <td className="px-3 py-2 align-top">
        <NumeroCelda
          value={v.stock_actual}
          onChange={(valor) => onEditar(v.key, 'stock_actual', valor ?? 0)}
          ariaLabel="Stock actual"
        />
        <p className="mt-xs font-mono text-[10px] text-ink-faint">mín. {v.stock_minimo}</p>
      </td>

      {/* Precio regular */}
      <td className="px-3 py-2 align-top">
        <NumeroCelda
          value={v.precio_regular}
          onChange={(valor) => onEditar(v.key, 'precio_regular', valor ?? 0)}
          ariaLabel="Precio regular"
          entero={false}
        />
      </td>

      {/* Precio de oferta */}
      <td className="px-3 py-2 align-top">
        <NumeroCelda
          value={v.precio_oferta}
          onChange={(valor) => onEditar(v.key, 'precio_oferta', valor)}
          ariaLabel="Precio de oferta"
          entero={false}
        />
        {v.precio_oferta !== null && (
          <p className="mt-xs text-[10px] text-ink-faint">Regular {formatearPrecio(v.precio_regular)}</p>
        )}
      </td>

      {/* Estado + acciones */}
      <td className="px-3 py-2 align-top">
        <div className="flex items-center justify-end gap-xs">
          {bloqueado && (
            <Button
              type="button"
              variant={v.activo ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={v.activo}
              onClick={() => onToggleActivo(v.key)}
            >
              {v.activo ? 'Activo' : 'Inactivo'}
            </Button>
          )}
          {eliminada ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRestaurar(v.key)}
              aria-label="Restaurar variante"
            >
              <RotateCcw size={13} aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onMarcarEliminar(v.key)}
              aria-label="Quitar variante"
              className="text-ink-mute hover:text-retail-red"
            >
              <Trash2 size={13} aria-hidden="true" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface VarianteInlineFormProps {
  atributos: AtributoCategoriaItem[];
  onConfirmar: (
    atributos: Record<string, string>,
    campos: { sku?: string; codigo_barras?: string | null; precio_regular: number; precio_oferta?: number | null; stock_actual: number; stock_minimo?: number }
  ) => void;
  onCancelar: () => void;
}

function VarianteInlineForm({ atributos, onConfirmar, onCancelar }: VarianteInlineFormProps): React.ReactElement {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [sku, setSku] = useState('');
  const [precio, setPrecio] = useState('');
  const [oferta, setOferta] = useState('');
  const [stock, setStock] = useState('');
  const [error, setError] = useState<string | null>(null);

  const confirmar = (): void => {
    const faltantes = atributos.filter((a) => !valores[a.codigo]);
    if (faltantes.length > 0) {
      setError(`Elige un valor para: ${faltantes.map((a) => a.nombre).join(', ')}`);
      return;
    }
    const precioNum = Number(precio);
    if (!precio || Number.isNaN(precioNum) || precioNum <= 0) {
      setError('Ingresa un precio mayor a 0');
      return;
    }
    const ofertaNum = oferta === '' ? null : Number(oferta);
    if (ofertaNum !== null && (Number.isNaN(ofertaNum) || ofertaNum >= precioNum)) {
      setError('La oferta debe ser menor que el precio regular');
      return;
    }
    const stockNum = stock === '' ? 0 : Number(stock);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      setError('El stock no puede ser negativo');
      return;
    }

    onConfirmar(valores, {
      ...(sku.trim() ? { sku: sku.trim() } : {}),
      precio_regular: precioNum,
      precio_oferta: ofertaNum,
      stock_actual: Math.trunc(stockNum),
    });
    setValores({});
    setSku('');
    setPrecio('');
    setOferta('');
    setStock('');
    setError(null);
  };

  return (
    <tr className="bg-primary/5">
      <td className="px-3 py-2 align-top" colSpan={2}>
        <div className="flex flex-wrap items-center gap-sm">
          {atributos.map((a) => (
            <Select
              key={a.codigo}
              value={valores[a.codigo] ?? ''}
              onChange={(valor) => setValores((prev) => ({ ...prev, [a.codigo]: valor }))}
              options={[
                { value: '', label: a.nombre },
                ...a.valores.map<SelectOption>((v) => ({ value: v.valor, label: v.valor })),
              ]}
              aria-label={a.nombre}
              containerClassName="relative min-w-[150px]"
            />
          ))}
          <Input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU (auto)"
            aria-label="SKU sugerido"
            className="h-9 w-40 font-mono text-xs"
          />
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          type="number"
          min={0}
          step={1}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Stock"
          aria-label="Stock inicial"
          className="h-9 w-24 font-mono text-xs tabular-nums"
        />
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="Precio"
          aria-label="Precio regular"
          className="h-9 w-24 font-mono text-xs tabular-nums"
        />
      </td>
      <td className="px-3 py-2 align-top">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={oferta}
          onChange={(e) => setOferta(e.target.value)}
          placeholder="Oferta"
          aria-label="Precio de oferta"
          className="h-9 w-24 font-mono text-xs tabular-nums"
        />
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-center justify-end gap-xs">
          <Button type="button" size="sm" onClick={confirmar}>
            <Check size={13} aria-hidden="true" />
            Confirmar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancelar}
            aria-label="Cancelar variante"
          >
            <X size={14} aria-hidden="true" />
          </Button>
        </div>
        {error && (
          <p role="alert" aria-live="polite" className="mt-xs text-right text-[11px] text-retail-red">
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}

export interface VariantesTableProps {
  variantes: VarianteDraft[];
  atributos: AtributoCategoriaItem[];
  /** true cuando aún no se eligió una categoría con atributos. */
  deshabilitado: boolean;
  onAgregar: (key: string, atributos: Record<string, string>, campos: Parameters<VarianteInlineFormProps['onConfirmar']>[1]) => void;
  onEditar: VarianteRowProps['onEditar'];
  onToggleActivo: (key: string) => void;
  onMarcarEliminar: (key: string) => void;
  onRestaurar: (key: string) => void;
}

/** Tabla vertical común de variantes (adiós matrices cruzadas — HU035 CA06). */
export function VariantesTable({
  variantes,
  atributos,
  deshabilitado,
  onAgregar,
  onEditar,
  onToggleActivo,
  onMarcarEliminar,
  onRestaurar,
}: VariantesTableProps): React.ReactElement {
  const [formAbierto, setFormAbierto] = useState(false);

  return (
    <div>
      <div className="mb-sm flex items-center justify-between gap-sm">
        <p className="text-xs text-ink-mute">
          {variantes.filter((v) => v.estado !== 'eliminada').length} variante(s). Cada variante es un
          SKU físico con su propio stock.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={deshabilitado}
          onClick={() => setFormAbierto(true)}
        >
          <Plus size={13} aria-hidden="true" />
          Agregar variante
        </Button>
      </div>

      {deshabilitado && (
        <p className="mb-sm rounded-sm border border-hairline bg-canvas-soft px-sm py-xs text-xs text-ink-mute">
          Elige una categoría para habilitar sus atributos de variante.
        </p>
      )}

      <div className="overflow-hidden rounded-sm border border-hairline bg-canvas">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-canvas-soft">
                {['Atributos', 'SKU / Código de barras', 'Stock', 'Precio', 'Oferta'].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-widest text-ink-mute"
                  >
                    {label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-mono text-xs font-medium uppercase tracking-widest text-ink-mute">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-cool">
              {variantes.length === 0 && !formAbierto && (
                <tr>
                  <td colSpan={6} className="px-lg py-xl text-center text-xs text-ink-mute">
                    Aún no hay variantes. Usa “Agregar variante” para crear el primer SKU.
                  </td>
                </tr>
              )}
              {variantes.map((v) => (
                <VarianteRow
                  key={v.key}
                  variante={v}
                  atributos={atributos}
                  onEditar={onEditar}
                  onToggleActivo={onToggleActivo}
                  onMarcarEliminar={onMarcarEliminar}
                  onRestaurar={onRestaurar}
                />
              ))}
              {formAbierto && (
                <VarianteInlineForm
                  atributos={atributos}
                  onCancelar={() => setFormAbierto(false)}
                  onConfirmar={(vals, campos) => {
                    onAgregar(crypto.randomUUID(), vals, campos);
                    setFormAbierto(false);
                  }}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default VariantesTable;
