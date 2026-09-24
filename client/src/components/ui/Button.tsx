import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-deep active:bg-primary-deep',
  secondary:
    'border border-hairline-strong bg-canvas text-ink hover:bg-hairline-cool active:bg-hairline-cool',
  ghost: 'text-ink-mute hover:bg-hairline-cool hover:text-ink',
  danger: 'bg-retail-red text-white hover:bg-retail-red/90 active:bg-retail-red/80',
  link: 'text-ink hover:text-primary hover:underline underline-offset-2',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-sm text-xs',
  md: 'h-9 px-sm text-sm',
  icon: 'h-7 w-7 p-0',
  none: '',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string
): string {
  return cn(
    'inline-flex items-center justify-center gap-xs whitespace-nowrap rounded-xs font-medium select-none',
    'transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un spinner y bloquea el botón (prevención de doble envío). */
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading = false, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {isLoading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
