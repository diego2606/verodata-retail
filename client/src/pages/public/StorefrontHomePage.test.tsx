import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontHomePage } from './StorefrontHomePage';
import type {
  BannerPublico,
  CategoriaPublicaNodo,
  CatalogoPaginado,
  HomeData,
  ProductoPublico,
} from '../../types/storefront.types';

function banner(over: Partial<BannerPublico> = {}): BannerPublico {
  return {
    id: 'b1',
    ubicacion: 'HERO',
    titulo: 'Equípate para el día a día',
    etiqueta: 'Temporada',
    subtitulo: 'Calzado y accesorios',
    cta_texto: 'Ver todo',
    cta_url: '/catalogo',
    imagen_url: 'https://cdn.verodata.test/hero.jpg',
    orden: 0,
    ...over,
  };
}

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
    imagen_url: null,
    modelo: null,
    atributos: {},
    disponible: true,
    stock_total: 5,
    variantes: 1,
    ...over,
  };
}

const CATEGORIAS: CategoriaPublicaNodo[] = [
  { id: 1, nombre: 'Calzado', slug: 'calzado', descripcion: null, categoria_padre_id: null, hijos: [] },
  { id: 2, nombre: 'Ropa', slug: 'ropa', descripcion: null, categoria_padre_id: null, hijos: [] },
  { id: 3, nombre: 'Accesorios', slug: 'accesorios', descripcion: null, categoria_padre_id: null, hijos: [] },
];

function home(over: Partial<HomeData> = {}): HomeData {
  return {
    banners: { hero: [banner()], ticker: [], banda: [] },
    config: {},
    categorias: CATEGORIAS,
    ofertas: [producto({ id: 'o1', nombre: 'Zapatilla en oferta', descuento_pct: 25, precio_oferta: 180 })],
    nuevos: [producto({ id: 'n1', nombre: 'Polo nuevo' })],
    destacados: [producto({ id: 'd1', nombre: 'Mochila destacada' })],
    ...over,
  };
}

const paginado: CatalogoPaginado = {
  items: [producto({ id: 'v1', nombre: 'Producto de vitrina' })],
  pagina: 1,
  total_paginas: 1,
  total: 1,
};

const fetchMock = vi.fn();

function respuesta(payload: unknown): Response {
  return { status: 200, json: () => Promise.resolve(payload) } as unknown as Response;
}

function ok<T>(data: T): Response {
  return respuesta({ success: true, message: 'ok', data });
}

function stubHome(data: HomeData | 'error' | 'pendiente'): void {
  fetchMock.mockImplementation((url: string) => {
    const destino = String(url);
    if (destino.includes('/storefront/home')) {
      if (data === 'error') return Promise.reject(new TypeError('Failed to fetch'));
      if (data === 'pendiente') return new Promise(() => undefined);
      return Promise.resolve(ok(data));
    }
    return Promise.resolve(ok(paginado));
  });
}

function renderHome() {
  return render(
    <MemoryRouter>
      <StorefrontHomePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StorefrontHomePage', () => {
  it('muestra la silueta de carga antes de tener datos', () => {
    stubHome('pendiente');
    const { container } = renderHome();

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    expect(screen.queryByText('Ofertas de la semana')).not.toBeInTheDocument();
  });

  it('compone las secciones de la portada en orden', async () => {
    stubHome(home());
    renderHome();

    expect(await screen.findByText('Equípate para el día a día')).toBeInTheDocument();
    expect(screen.getByText('Temporada')).toBeInTheDocument();
    expect(screen.getByText('Destacados')).toBeInTheDocument();
    expect(screen.getByText('Ofertas de la semana')).toBeInTheDocument();
    expect(screen.getByText('Nuevos ingresos')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Compra con confianza' })).toBeInTheDocument();
  });

  it('renderiza la barra de departamentos con acceso a "Ver todo"', async () => {
    stubHome(home());
    renderHome();
    await screen.findByText('Equípate para el día a día');

    const barra = screen.getByRole('region', { name: 'Accesos por departamento' });
    expect(within(barra).getByRole('link', { name: 'Calzado' })).toHaveAttribute(
      'href',
      '/catalogo?categoria_id=1'
    );
    expect(within(barra).getByRole('link', { name: 'Ver todo' })).toHaveAttribute('href', '/catalogo');
  });

  it('oculta las secciones sin contenido', async () => {
    stubHome(home({ ofertas: [], nuevos: [], destacados: [], banners: { hero: [], ticker: [], banda: [] } }));
    renderHome();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(screen.queryByText('Ofertas de la semana')).not.toBeInTheDocument();
    expect(screen.queryByText('Nuevos ingresos')).not.toBeInTheDocument();
    expect(screen.queryByText('Destacados')).not.toBeInTheDocument();
  });

  it('usa el texto de respaldo del hero cuando no hay banners', async () => {
    stubHome(home({ banners: { hero: [], ticker: [], banda: [] } }));
    renderHome();

    expect(await screen.findByText('Equípate para el día a día')).toBeInTheDocument();
  });

  it('muestra la banda editorial con su sobre-título', async () => {
    stubHome(
      home({
        banners: {
          hero: [banner()],
          ticker: [],
          banda: [
            banner({
              id: 'be1',
              ubicacion: 'BANDA_EDITORIAL',
              titulo: 'La ciudad es tuya',
              etiqueta: 'Editorial',
              subtitulo: 'Historia de campaña',
            }),
          ],
        },
      })
    );
    renderHome();

    expect(await screen.findByText('La ciudad es tuya')).toBeInTheDocument();
    expect(screen.getByText('Editorial')).toBeInTheDocument();
  });

  it('muestra el cintillo promocional cuando existe', async () => {
    stubHome(
      home({
        banners: {
          hero: [banner()],
          ticker: [banner({ id: 't1', ubicacion: 'TICKER', titulo: 'Cuotas sin intereses' })],
          banda: [],
        },
      })
    );
    renderHome();

    expect(await screen.findByText('Cuotas sin intereses')).toBeInTheDocument();
  });

  it('usa la franja de confianza configurada y el respaldo si no hay', async () => {
    stubHome(home({ config: { franja_confianza: [{ titulo: 'Envío gratis', texto: 'Desde S/ 99' }] } }));
    renderHome();

    expect(await screen.findByText('Envío gratis')).toBeInTheDocument();
    expect(screen.getByText('Desde S/ 99')).toBeInTheDocument();
    expect(screen.queryByText('Envíos a todo el Perú')).not.toBeInTheDocument();
  });

  it('cae al respaldo de la franja cuando la config es inválida', async () => {
    stubHome(home({ config: { franja_confianza: 'no-es-un-arreglo' } }));
    renderHome();

    expect(await screen.findByText('Envíos a todo el Perú')).toBeInTheDocument();
  });

  it('permite navegar el carrusel del hero', async () => {
    stubHome(
      home({
        banners: {
          hero: [banner({ id: 'h1', titulo: 'Slide uno' }), banner({ id: 'h2', titulo: 'Slide dos' })],
          ticker: [],
          banda: [],
        },
      })
    );
    renderHome();
    await screen.findByText('Slide uno');

    expect(screen.getByText('01/02')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Slide siguiente' }));

    expect(screen.getByText('Slide dos')).toBeInTheDocument();
    expect(screen.getByText('02/02')).toBeInTheDocument();
  });

  it('muestra el error y permite reintentar', async () => {
    stubHome('error');
    renderHome();

    expect(await screen.findByText('No pudimos cargar la información')).toBeInTheDocument();

    const antes = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(antes));
  });
});
