import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Aplica el estado de error del sistema (borde rojo). */
  invalid?: boolean;
}

/**
 * Área de texto del design system (Backoffice).
 * `forwardRef` para integrarse con react-hook-form.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full min-h-[80px] resize-y rounded-sm border bg-canvas px-sm py-xs text-sm text-ink',
        'transition-colors duration-150 placeholder:text-ink-faint',
        'focus:outline-none focus:ring-1 focus:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid ? 'border-retail-red/60' : 'border-hairline focus:border-primary',
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
