import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import type { ProductoPublico } from '../../types/storefront.types';

function producto(over: Partial<ProductoPublico> = {}): ProductoPublico {
  return {
    id: 'p1',
    categoria_id: 1,
    categoria_nombre: 'Calzado',
    categoria_slug: 'calzado',
    sku: 'CAL-001',
    nombre: 'Zapatilla Court',
    descripcion: null,
    precio_regular: 249.9,
    precio_oferta: null,
    descuento_pct: 0,
    imagen_url: 'https://cdn.verodata.test/p1.png',
    modelo: 'court',
    atributos: {},
    disponible: true,
    stock_total: 7,
    variantes: 1,
    ...over,
  };
}

function montar(p: ProductoPublico = producto()): void {
  render(
    <MemoryRouter>
      <ProductCard producto={p} />
    </MemoryRouter>
  );
}

describe('ProductCard', () => {
  it('enlaza al detalle del producto', () => {
    montar(producto({ id: 'abc' }));
    expect(screen.getByRole('link')).toHaveAttribute('href', '/producto/abc');
  });

  it('muestra categoría, nombre, precio y disponibilidad', () => {
    montar();
    expect(screen.getByText('Calzado')).toBeInTheDocument();
    expect(screen.getByText('Zapatilla Court')).toBeInTheDocument();
    expect(screen.getByText(/249\.90/)).toBeInTheDocument();
    expect(screen.getByText('En stock')).toBeInTheDocument();
  });

  it('en oferta muestra el badge, el precio de oferta y tacha el regular', () => {
    montar(producto({ precio_regular: 400, precio_oferta: 300, descuento_pct: 25 }));
    expect(screen.getByText('-25%')).toBeInTheDocument();
    expect(screen.getByText(/300\.00/)).toBeInTheDocument();
    expect(screen.getByText(/400\.00/)).toHaveClass('line-through');
  });

  it('marca como agotado y dice "Sin stock" cuando no está disponible', () => {
    montar(producto({ disponible: false, stock_total: 0 }));
    expect(screen.getByText('Agotado')).toBeInTheDocument();
    expect(screen.getByText('Sin stock')).toBeInTheDocument();
  });

  it('invita a ver el producto en lugar de un carrito inexistente (HU020 pendiente)', () => {
    montar();
    expect(screen.getByText('Ver producto')).toBeInTheDocument();
    expect(screen.queryByText('Agregar a la bolsa')).not.toBeInTheDocument();
  });

  it('pinta el swatch cuando el producto tiene color', () => {
    montar(producto({ atributos: { COLOR: 'Negro' } }));
    expect(screen.getByText('Negro')).toBeInTheDocument();
  });

  it('no muestra color cuando el producto no lo declara', () => {
    montar(producto({ atributos: {} }));
    expect(screen.queryByText('Negro')).not.toBeInTheDocument();
  });

  it('muestra el respaldo cuando falta la imagen', () => {
    montar(producto({ imagen_url: null }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('el skeleton no expone contenido accesible', () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
