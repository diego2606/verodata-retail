import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  onClose: () => void;
  labelledBy?: string;
  children: React.ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
  closeOnOverlayClick?: boolean;
}

/**
 * Modal accesible: foco inicial, focus-trap (Tab/Shift+Tab), cierre con Esc,
 * restauración del foco al cerrar y cierre al clicar fuera del panel.
 * Se renderiza solo cuando está abierto (montaje condicional).
 */
export function Modal({
  onClose,
  labelledBy,
  children,
  overlayClassName,
  panelClassName,
  closeOnOverlayClick = true,
}: ModalProps): React.ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeOnOverlayClickRef = useRef(closeOnOverlayClick);
  closeOnOverlayClickRef.current = closeOnOverlayClick;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const initial = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (initial && initial.length > 0 ? initial[0] : panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        element => element.offsetParent !== null
      );
      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // S6848: el cierre al clicar fuera del panel se resuelve con un listener de
    // documento, en lugar de un handler sobre el <div> del overlay (elemento no
    // interactivo). Se usa un ref para no depender de props en la closure.
    const handleMouseDown = (event: MouseEvent): void => {
      if (!closeOnOverlayClickRef.current || !panel) return;
      if (event.target instanceof Node && !panel.contains(event.target)) {
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-lg', overlayClassName)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'w-full rounded-sm border border-hairline bg-canvas p-xl focus:outline-none',
          'max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain',
          'animate-modal-in motion-reduce:animate-none',
          panelClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
