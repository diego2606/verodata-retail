import React from 'react';
import { AlertTriangle, PackageOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProductCardSkeleton } from './ProductCard';

/** Rejilla de skeletons idéntica a la rejilla real de tarjetas. */
export function GrillaSkeleton({ cantidad = 8 }: { cantidad?: number }): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: cantidad }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

interface EstadoErrorProps {
  mensaje: string;
  onReintentar: () => void;
}

export function EstadoError({ mensaje, onReintentar }: EstadoErrorProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-md rounded-lg border border-store-line bg-store-surface px-lg py-huge text-center">
      <AlertTriangle size={32} className="text-store-offer" aria-hidden="true" />
      <div className="flex flex-col gap-xs">
        <p className="text-base font-semibold text-store-ink">No pudimos cargar la información</p>
        <p className="text-sm text-store-ink-soft">{mensaje}</p>
      </div>
      <Button variant="secondary" onClick={onReintentar}>Reintentar</Button>
    </div>
  );
}

interface EstadoVacioProps {
  titulo: string;
  descripcion: string;
  labelAccion?: string;
  onAccion?: () => void;
}

export function EstadoVacio({ titulo, descripcion, labelAccion, onAccion }: EstadoVacioProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-md rounded-lg border border-store-line bg-store-surface px-lg py-huge text-center">
      <PackageOpen size={32} className="text-store-ink-mute" aria-hidden="true" />
      <div className="flex flex-col gap-xs">
        <p className="text-base font-semibold text-store-ink">{titulo}</p>
        <p className="text-sm text-store-ink-soft">{descripcion}</p>
      </div>
      {labelAccion && onAccion && (
        <Button variant="secondary" onClick={onAccion}>{labelAccion}</Button>
      )}
    </div>
  );
}
