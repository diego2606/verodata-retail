import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CatalogPage } from './CatalogPage';
import type { CatalogoPaginado, CategoriaPublicaNodo, ProductoPublico } from '../../types/storefront.types';

const CATEGORIAS: CategoriaPublicaNodo[] = [
  {
    id: 1,
    nombre: 'Tecnología',
    slug: 'tecnologia',
    descripcion: null,
    categoria_padre_id: null,
    hijos: [
      {
        id: 2,
        nombre: 'Laptops',
        slug: 'laptops',
        descripcion: null,
        categoria_padre_id: 1,
        hijos: [],
      },
    ],
  },
];

function producto(over: Partial<ProductoPublico> = {}): ProductoPublico {
  return {
    id: 'p1',
    categoria_id: 1,
    categoria_nombre: 'Tecnología',
    categoria_slug: 'tecnologia',
    sku: 'TEC-001',
    nombre: 'Laptop Pro 14',
    descripcion: null,
    precio_regular: 3999,
    precio_oferta: null,
    descuento_pct: 0,
    imagen_url: null,
    modelo: null,
    atributos: {},
    disponible: true,
    stock_total: 5,
    variantes: 1,
    ...over,
  };
}

function paginado(over: Partial<CatalogoPaginado> = {}): CatalogoPaginado {
  return { items: [producto()], pagina: 1, total_paginas: 1, total: 1, ...over };
}

const fetchMock = vi.fn();

function respuesta(payload: unknown, status = 200): Response {
  return { status, json: () => Promise.resolve(payload) } as unknown as Response;
}

function stubFetch(productos: CatalogoPaginado | 'error', categorias: CategoriaPublicaNodo[] = CATEGORIAS): void {
  fetchMock.mockImplementation((url: string) => {
    const destino = String(url);

    if (destino.includes('/storefront/categories')) {
      return Promise.resolve(respuesta({ success: true, message: 'ok', data: categorias }));
    }
    if (productos === 'error') return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve(respuesta({ success: true, message: 'ok', data: productos }));
  });
}

function renderCatalogo(entrada = '/catalogo') {
  return render(
    <MemoryRouter initialEntries={[entrada]}>
      <CatalogPage />
    </MemoryRouter>
  );
}

/** URL de la última consulta al endpoint de productos. */
function ultimaUrlProductos(): string {
  const llamadas = fetchMock.mock.calls.filter(([url]) => String(url).includes('/storefront/products'));
  expect(llamadas.length, 'no se consultó el endpoint de productos').toBeGreaterThan(0);
  return String(llamadas[llamadas.length - 1][0]);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('CatalogPage', () => {
  it('anuncia la carga mientras espera la respuesta', () => {
    stubFetch(paginado());
    renderCatalogo();

    expect(screen.getByText('Cargando resultados')).toBeInTheDocument();
  });

  it('lista los productos con categoría, precio y contador total', async () => {
    stubFetch(
      paginado({
        items: [producto(), producto({ id: 'p2', nombre: 'Mouse Inalámbrico', precio_regular: 89.9 })],
        total: 2,
      })
    );
    renderCatalogo();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    expect(screen.getByText('Mouse Inalámbrico')).toBeInTheDocument();
    expect(screen.getAllByText('Tecnología').length).toBeGreaterThan(0);
    expect(screen.getByText(/3,999\.00/)).toBeInTheDocument();
    expect(screen.getByText(/89\.90/)).toBeInTheDocument();
    expect(screen.getByText(/^2 productos$/)).toBeInTheDocument();
  });

  it('enlaza cada tarjeta al detalle del producto', async () => {
    stubFetch(paginado({ items: [producto({ id: 'abc-123' })] }));
    renderCatalogo();

    const enlace = await screen.findByRole('link', { name: /Laptop Pro 14/ });
    expect(enlace).toHaveAttribute('href', '/producto/abc-123');
  });

  it('muestra el descuento y tacha el precio regular en oferta', async () => {
    stubFetch(
      paginado({
        items: [producto({ precio_regular: 400, precio_oferta: 300, descuento_pct: 25 })],
      })
    );
    renderCatalogo();

    expect(await screen.findByText('-25%')).toBeInTheDocument();
    expect(screen.getByText(/300\.00/)).toBeInTheDocument();
    expect(screen.getByText(/400\.00/)).toHaveClass('line-through');
  });

  it('marca como agotado el producto sin stock', async () => {
    stubFetch(paginado({ items: [producto({ disponible: false, stock_total: 0 })] }));
    renderCatalogo();

    expect(await screen.findByText('Agotado')).toBeInTheDocument();
  });

  it('muestra "Sin resultados" con acción de limpiar cuando la búsqueda no devuelve nada', async () => {
    stubFetch(paginado({ items: [], total: 0 }));
    renderCatalogo('/catalogo?search=zapatillas');

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText(/para “zapatillas”/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => expect(ultimaUrlProductos()).not.toContain('search=zapatillas'));
  });

  it('muestra "Catálogo vacío" sin botón de limpiar cuando no hay filtros', async () => {
    stubFetch(paginado({ items: [], total: 0 }));
    renderCatalogo();

    expect(await screen.findByText('Catálogo vacío')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
  });

  it('muestra el estado de error y permite reintentar', async () => {
    stubFetch('error');
    renderCatalogo();

    expect(await screen.findByText('No pudimos cargar la información')).toBeInTheDocument();
    expect(screen.getByText('No se pudo conectar con el servidor')).toBeInTheDocument();

    const antes = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(antes));
  });

  it('aplica los filtros del formulario a la consulta', async () => {
    stubFetch(paginado());
    renderCatalogo();
    await screen.findByText('Laptop Pro 14');

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'laptop pro' } });
    fireEvent.change(screen.getByLabelText('Precio mín.'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Precio máx.'), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => expect(ultimaUrlProductos()).toContain('search=laptop+pro'));
    const url = ultimaUrlProductos();
    expect(url).toContain('precio_min=100');
    expect(url).toContain('precio_max=2500');
  });

  it('filtra por categoría al pulsar un chip', async () => {
    stubFetch(paginado());
    renderCatalogo();
    await screen.findByText('Laptop Pro 14');

    fireEvent.click(screen.getByRole('button', { name: '· Laptops' }));

    await waitFor(() => expect(ultimaUrlProductos()).toContain('categoria_id=2'));
    expect(screen.getByRole('button', { name: '· Laptops' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('pagina y vuelve al inicio de la página', async () => {
    stubFetch(paginado({ items: [producto()], pagina: 1, total_paginas: 3, total: 60 }));
    renderCatalogo();

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(ultimaUrlProductos()).toContain('pagina=2'));
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('oculta la paginación cuando hay una sola página', async () => {
    stubFetch(paginado({ total_paginas: 1 }));
    renderCatalogo();

    await screen.findByText('Laptop Pro 14');
    expect(screen.queryByText(/^Página /)).not.toBeInTheDocument();
  });

  it('funciona aunque el endpoint de categorías falle', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('/storefront/categories')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve(respuesta({ success: true, message: 'ok', data: paginado() }))
    );
    renderCatalogo();

    expect(await screen.findByText('Laptop Pro 14')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Todas' })).not.toBeInTheDocument();
  });
});
