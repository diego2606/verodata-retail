import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReposicionesPage } from './ReposicionesPage';
import type { ReposicionItem } from '../../../types/reposicion.types';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function envelope(payload: unknown): Response {
  return { status: 200, json: () => Promise.resolve(payload) } as unknown as Response;
}

function respuestaPagina(items: ReposicionItem[], total: number): Response {
  return envelope({ success: true, message: 'ok', data: { items, total, page: 1, limit: 10 } });
}

const ORDEN: ReposicionItem = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  proveedor_id: '11111111-1111-1111-1111-111111111111',
  proveedor_nombre: 'Distribuidora Andina',
  estado: 'PENDIENTE',
  fecha_emision: '2026-10-01T10:00:00.000Z',
  fecha_estimada_arribo: '2026-10-15',
  notas: null,
  costo_total: 125.5,
  unidades_totales: 10,
  usuario_id: null,
  motivo_cancelacion: null,
  recibido_en: null,
  creado_en: '2026-10-01T10:00:00.000Z',
  actualizado_en: '2026-10-01T10:00:00.000Z',
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/admin/reposiciones']}>
      <ReposicionesPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('ReposicionesPage (HU036 CA07/CA10)', () => {
  it('muestra el skeleton y luego el historial', async () => {
    fetchMock.mockResolvedValue(respuestaPagina([ORDEN], 1));
    renderPage();

    expect(screen.getByLabelText('Cargando órdenes de reposición')).toBeInTheDocument();

    expect(await screen.findByText('Distribuidora Andina')).toBeInTheDocument();
    expect(screen.getByText('#AAAAAAAA')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText(/1 orden/)).toBeInTheDocument();
  });

  it('muestra el estado vacío con llamada a la acción', async () => {
    fetchMock.mockResolvedValue(respuestaPagina([], 0));
    renderPage();

    expect(await screen.findByText('Todavía no hay órdenes de reposición')).toBeInTheDocument();
    // El encabezado y el estado vacío ofrecen la acción de crear.
    expect(screen.getAllByRole('link', { name: /Nueva reposición/i }).length).toBeGreaterThanOrEqual(2);
  });

  it('muestra el error con reintento', async () => {
    fetchMock.mockResolvedValue(
      envelope({ success: false, error: { code: 'INTERNAL_ERROR', message: 'boom', details: null } })
    );
    renderPage();

    expect(await screen.findByText('No se pudo cargar el historial')).toBeInTheDocument();

    fetchMock.mockResolvedValue(respuestaPagina([ORDEN], 1));
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(await screen.findByText('Distribuidora Andina')).toBeInTheDocument();
  });

  it('pagina hacia la siguiente página', async () => {
    fetchMock.mockResolvedValue(respuestaPagina([ORDEN], 25));
    renderPage();

    await screen.findByText('Distribuidora Andina');
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('page=2'))).toBe(true);
    });
  });
});
