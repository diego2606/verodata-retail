import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button, buttonClasses } from './Button';

describe('Button', () => {
  it('renderiza el contenido y dispara onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('se bloquea y muestra el spinner durante la carga', () => {
    render(<Button isLoading>Guardar</Button>);

    const boton = screen.getByRole('button', { name: 'Guardar' });
    expect(boton).toBeDisabled();
    expect(boton.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('no dispara onClick cuando está deshabilitado', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('aplica las clases de la variante y el tamaño indicados', () => {
    render(
      <Button variant="danger" size="sm">
        Eliminar
      </Button>
    );

    const boton = screen.getByRole('button');
    expect(boton.className).toContain('bg-retail-red');
    expect(boton.className).toContain('h-7');
  });

  it('permite añadir clases propias', () => {
    render(<Button className="w-full">Ancho completo</Button>);

    expect(screen.getByRole('button').className).toContain('w-full');
  });

  it('propaga las props nativas del botón', () => {
    render(
      <Button type="submit" data-testid="enviar">
        Enviar
      </Button>
    );

    expect(screen.getByTestId('enviar')).toHaveAttribute('type', 'submit');
  });
});

describe('buttonClasses', () => {
  it('usa la variante y el tamaño por defecto', () => {
    const clases = buttonClasses();

    expect(clases).toContain('bg-primary');
    expect(clases).toContain('h-9');
  });

  it('respeta la variante y el tamaño indicados', () => {
    expect(buttonClasses('ghost', 'icon')).toContain('h-7');
    expect(buttonClasses('ghost', 'icon')).toContain('w-7');
  });

  it('el tamaño "none" no impone altura', () => {
    expect(buttonClasses('link', 'none')).not.toContain('h-9');
  });
});
