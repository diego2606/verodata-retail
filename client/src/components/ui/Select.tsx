import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Clases del contenedor (útil para controlar el ancho en barras flex). */
  containerClassName?: string;
  'aria-label'?: string;
}

/**
 * Listbox propio (sin dependencias) para tener control total del panel abierto.
 * - Navegación por teclado: ↑ ↓ Home End Enter Espacio Esc Tab.
 * - ARIA: combobox + listbox + option (aria-expanded/selected/activedescendant).
 * - Cierre al hacer clic fuera.
 * - `forwardRef` al trigger para integrarse con react-hook-form.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    id,
    name,
    value,
    onChange,
    onBlur,
    options,
    placeholder = 'Seleccionar…',
    invalid = false,
    disabled = false,
    containerClassName,
    'aria-label': ariaLabel,
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedIndex = options.findIndex(option => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Cierre al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const openList = (): void => {
    if (disabled) return;
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const commit = (index: number): void => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else setHighlighted(h => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList();
        else setHighlighted(h => Math.max(h - 1, 0));
        break;
      case 'Home':
        if (open) {
          event.preventDefault();
          setHighlighted(0);
        }
        break;
      case 'End':
        if (open) {
          event.preventDefault();
          setHighlighted(options.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) openList();
        else commit(highlighted);
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case 'Tab':
        if (open) setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', containerClassName)}>
      <button
        ref={ref}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-opt-${highlighted}` : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        className={cn(
          'flex w-full items-center justify-between gap-sm rounded-sm border bg-canvas py-xs pl-sm pr-sm text-left text-sm',
          'transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid ? 'border-retail-red/60' : 'border-hairline focus:border-primary'
        )}
      >
        <span className={cn('truncate', selected ? 'text-ink' : 'text-ink-faint')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-ink-mute transition-transform duration-150', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-50 mt-xs max-h-60 w-full overflow-auto rounded-sm border border-hairline bg-canvas py-xxs"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlighted;
            return (
              <li
                key={option.value}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={event => event.preventDefault()}
                onClick={() => commit(index)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-sm px-3 py-2 text-sm',
                  isHighlighted ? 'bg-hairline-cool text-ink' : 'text-ink-secondary',
                  isSelected && 'font-medium text-ink'
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check size={14} className="shrink-0 text-primary-ink" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

export default Select;
