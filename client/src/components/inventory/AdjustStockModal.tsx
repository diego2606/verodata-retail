import React, { useState } from 'react';
import { AlertTriangle, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import type { InventarioItem, ProductoItem } from '../../types/product.types';

const labelClass = 'block text-xs font-medium text-ink mb-xs';

const TIPO_AJUSTE_OPTIONS: SelectOption[] = [
  { value: 'INGRESO', label: 'Ingreso (compra a proveedor)' },
  { value: 'MERMA', label: 'Merma / ajuste negativo' },
];

interface AdjustStockModalProps {
  producto: ProductoItem;
  onClose: () => void;
  onAdjusted: (message: string) => void;
}

/**
 * HU010: ajuste de inventario físico por SKU (ingreso/merma y stock mínimo).
 * HU011: la validación de stock no negativo se replica del backend para feedback inmediato.
 */
export function AdjustStockModal({
  producto,
  onClose,
  onAdjusted,
}: AdjustStockModalProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'INGRESO' | 'MERMA'>('INGRESO');
  const [cantidad, setCantidad] = useState('');
  const [stockMinimo, setStockMinimo] = useState(String(producto.stock_minimo));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cantidadNum = Number(cantidad);
  const delta = Number.isInteger(cantidadNum) ? cantidadNum * (tipo === 'INGRESO' ? 1 : -1) : 0;
  const resultante = producto.stock_actual + delta;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setServerError(null);

    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setServerError('Ingresa una cantidad entera mayor a 0');
      return;
    }

    const body: { ajuste: number; stock_minimo?: number } = { ajuste: delta };
    const minimo = Number(stockMinimo);
    if (stockMinimo !== '' && Number.isInteger(minimo) && minimo !== producto.stock_minimo) {
      body.stock_minimo = minimo;
    }

    setIsSubmitting(true);
    try {
      const json = await apiClient.patch<InventarioItem>(
        `/api/v1/inventory/${producto.id}`,
        body
      );
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onAdjusted(`Stock de ${producto.sku} actualizado a ${json.data.stock_actual}`);
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Error de conexión. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="ajustar-stock-titulo" panelClassName="max-w-md">
      <div className="mb-lg flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <SlidersHorizontal size={16} className="text-primary-ink" aria-hidden="true" />
          <h2 id="ajustar-stock-titulo" className="text-sm font-medium text-ink">
            Ajustar inventario
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      <div className="mb-md rounded-xs border border-hairline-cool bg-canvas-soft px-sm py-xs">
        <p className="font-mono text-xs text-ink">{producto.sku}</p>
        <p className="mt-xxs truncate text-xs text-ink-mute">{producto.nombre}</p>
        <p className="mt-xs text-xs text-ink-mute">
          Stock actual: <span className="font-mono tabular-nums text-ink">{producto.stock_actual}</span>
          {' · '}Mínimo: <span className="font-mono tabular-nums text-ink">{producto.stock_minimo}</span>
        </p>
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
        <div>
          <label htmlFor="tipo-ajuste" className={labelClass}>
            Tipo de movimiento
          </label>
          <Select
            id="tipo-ajuste"
            value={tipo}
            onChange={value => setTipo(value as 'INGRESO' | 'MERMA')}
            options={TIPO_AJUSTE_OPTIONS}
            aria-label="Tipo de movimiento"
          />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <label htmlFor="cantidad-ajuste" className={labelClass}>
              Cantidad
            </label>
            <Input
              id="cantidad-ajuste"
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              className="tabular-nums"
              placeholder="10"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="stock-minimo" className={labelClass}>
              Stock mínimo
            </label>
            <Input
              id="stock-minimo"
              type="number"
              step="1"
              min="0"
              inputMode="numeric"
              className="tabular-nums"
              value={stockMinimo}
              onChange={e => setStockMinimo(e.target.value)}
            />
          </div>
        </div>

        <p
          className={cn(
            'rounded-xs border px-sm py-xs text-xs',
            resultante < 0
              ? 'border-retail-red/30 bg-retail-red/5 text-retail-red'
              : 'border-hairline-cool bg-canvas-soft text-ink-mute'
          )}
        >
          Stock resultante: <span className="font-mono tabular-nums text-ink">{resultante}</span>
          {resultante < 0 && ' — no puede ser negativo'}
        </p>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={resultante < 0 || delta === 0}>
            {isSubmitting ? 'Aplicando…' : 'Aplicar ajuste'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AdjustStockModal;
