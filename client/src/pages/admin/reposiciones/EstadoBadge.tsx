import React from 'react';
import { cn } from '../../../lib/utils';
import type { EstadoReposicion } from '../../../types/reposicion.types';

const ESTILOS: Record<EstadoReposicion, string> = {
  PENDIENTE: 'border-retail-orange/40 bg-retail-orange/10 text-ink',
  RECIBIDO: 'border-primary/40 bg-primary/10 text-primary-ink',
  CANCELADO: 'border-retail-red/40 bg-retail-red/5 text-ink',
};

const PUNTO: Record<EstadoReposicion, string> = {
  PENDIENTE: 'bg-retail-orange',
  RECIBIDO: 'bg-primary',
  CANCELADO: 'bg-retail-red',
};

const ETIQUETAS: Record<EstadoReposicion, string> = {
  PENDIENTE: 'Pendiente',
  RECIBIDO: 'Recibido',
  CANCELADO: 'Cancelado',
};

/** Badge de estado de la orden: ámbar / esmeralda / rojo (HU036 CA10). */
export function EstadoBadge({ estado }: { estado: EstadoReposicion }): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-xs border px-xs py-xxs text-xs leading-none',
        ESTILOS[estado]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', PUNTO[estado])} aria-hidden="true" />
      {ETIQUETAS[estado]}
    </span>
  );
}

export default EstadoBadge;
