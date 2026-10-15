import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Modal, type ModalProps } from './Modal';

function montar(props: Partial<ModalProps> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <Modal onClose={onClose} labelledBy="titulo-modal" {...props}>
      <h2 id="titulo-modal">Confirmar</h2>
      <button type="button">Aceptar</button>
    </Modal>
  );
  return { onClose, ...utils };
}

describe('Modal', () => {
  it('expone el diálogo con sus atributos de accesibilidad', () => {
    montar();

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAttribute('aria-labelledby', 'titulo-modal');
  });

  it('mueve el foco al primer elemento enfocable del panel', () => {
    montar();

    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveFocus();
  });

  it('cierra con la tecla Escape', () => {
    const { onClose } = montar();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Regresión S6848: el cierre por clic fuera se resuelve con un listener de
  // documento, no con un handler sobre el <div> del overlay.
  it('cierra al pulsar fuera del panel', () => {
    const { onClose, container } = montar();

    fireEvent.mouseDown(container.firstElementChild as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra al pulsar dentro del panel', () => {
    const { onClose } = montar();

    fireEvent.mouseDown(screen.getByText('Confirmar'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('no cierra al pulsar fuera cuando closeOnOverlayClick es false', () => {
    const { onClose, container } = montar({ closeOnOverlayClick: false });

    fireEvent.mouseDown(container.firstElementChild as Element);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('mantiene el foco dentro del panel al pulsar Tab', () => {
    montar();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('restaura el foco previo y retira los listeners al desmontar', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    const { onClose, unmount } = montar();
    expect(disparador).not.toHaveFocus();

    unmount();

    expect(disparador).toHaveFocus();

    // Sin listeners activos, ni Escape ni clic fuera vuelven a cerrar.
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();

    disparador.remove();
  });
});
