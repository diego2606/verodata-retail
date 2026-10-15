import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FooterTienda } from './FooterTienda';

function montar(): void {
  render(
    <MemoryRouter>
      <FooterTienda />
    </MemoryRouter>
  );
}

describe('FooterTienda', () => {
  it('expone el directorio con sus tres columnas', () => {
    montar();

    expect(screen.getByRole('navigation', { name: 'Comprar' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Ayuda' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Nosotros' })).toBeInTheDocument();
  });

  it('muestra los medios de pago y el aviso de seguridad', () => {
    montar();

    expect(screen.getByText('Pago seguro')).toBeInTheDocument();
    for (const medio of ['Yape', 'Plin', 'Visa', 'Mastercard', 'Transferencia']) {
      expect(screen.getByText(medio)).toBeInTheDocument();
    }
    expect(screen.getByText('Tus datos viajan cifrados')).toBeInTheDocument();
  });

  it('muestra el aviso legal con el año actual', () => {
    montar();

    expect(
      screen.getByText(new RegExp(`© ${new Date().getFullYear()} VeroData Retail`))
    ).toBeInTheDocument();
    expect(screen.getByText('Precios en soles peruanos (PEN).')).toBeInTheDocument();
  });

  it('enlaza las redes sociales con etiqueta accesible', () => {
    montar();

    for (const red of ['Instagram', 'Facebook', 'YouTube']) {
      expect(screen.getByRole('link', { name: red })).toBeInTheDocument();
    }
  });
});
