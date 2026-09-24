import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Aplica el estado de error del sistema (borde rojo). */
  invalid?: boolean;
  /** Clases del contenedor (útil para controlar el ancho en barras flex). */
  containerClassName?: string;
}

/**
 * Select nativo estilizado (design system Backoffice).
 * - `appearance-none` + chevron propio para un acabado consistente.
 * - `forwardRef` para integrarse con react-hook-form.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, containerClassName, invalid = false, children, ...props },
  ref
) {
  return (
    <div className={cn('relative', containerClassName)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full appearance-none rounded-sm border bg-canvas py-xs pl-sm pr-8 text-sm text-ink',
          'transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid ? 'border-retail-red/60' : 'border-hairline focus:border-primary',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-ink-mute"
        aria-hidden="true"
      />
    </div>
  );
});

export default Select;
