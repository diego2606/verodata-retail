import React from 'react';
import { Construction } from 'lucide-react';
import { buttonClasses } from '../../components/ui/Button';

interface ComingSoonPageProps {
  title: string;
  description: string;
}

/**
 * Placeholder de módulos aún no implementados (Sprint 1 en curso).
 * Mantiene la navegación del sidebar operativa sin romper la sesión.
 */
export function ComingSoonPage({ title, description }: ComingSoonPageProps): React.ReactElement {
  return (
    <div>
      <div className="mb-xxl">
        <h1 className="text-heading-lg font-medium text-ink">{title}</h1>
        <p className="mt-xs text-sm text-ink-mute">{description}</p>
        <div className="mt-md h-px bg-hairline" />
      </div>

      <div className="flex flex-col items-center justify-center gap-md rounded-sm border border-dashed border-hairline-strong px-lg py-huge text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-sm border border-hairline bg-canvas-soft"
          aria-hidden="true"
        >
          <Construction size={18} className="text-ink-faint" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Módulo en construcción</p>
          <p className="mt-xs max-w-xs text-xs text-ink-mute">
            Esta sección se habilitará en un próximo sprint.
          </p>
        </div>
        <a href="/admin/dashboard" className={buttonClasses('primary', 'sm')}>
          Volver al dashboard
        </a>
      </div>
    </div>
  );
}

export default ComingSoonPage;
