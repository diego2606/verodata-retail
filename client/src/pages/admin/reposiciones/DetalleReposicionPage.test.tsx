import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DetalleReposicionPage } from './DetalleReposicionPage';
import type { ReposicionDetalle } from '../../../types/reposicion.types';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function envelope(payload: unknown): Response {
  return { status: 200, json: () => Promise.resolve(payload) } as unknown as Response;
}

const ORDEN_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const ORDEN: ReposicionDetalle = {
  id: ORDEN_ID,
  proveedor_id: '11111111-1111-1111-1111-111111111111',
  proveedor_nombre: 'Distribuidora Andina',
  estado: 'PENDIENTE',
  fecha_emision: '2026-10-01T10:00:00.000Z',
  fecha_estimada_arribo: '2026-10-15',
  notas: 'Pago a 30 días',
  costo_total: 125.5,
  unidades_totales: 5,
  usuario_id: null,
  motivo_cancelacion: null,
  recibido_en: null,
  creado_en: '2026-10-01T10:00:00.000Z',
  actualizado_en: '2026-10-01T10:00:00.000Z',
  detalles: [
    {
      id: 'd1',
      producto_id: '22222222-2222-2222-2222-222222222222',
      sku: 'ZAP-NEG-42',
      producto_nombre: 'Zapatilla Runner',
      atributos: { COLOR: 'Negro', SIZE: '42' },
      costo_unitario: 25.1,
      cantidad_pedida: 5,
      subtotal: 125.5,
    },
  ],
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={[`/admin/reposiciones/${ORDEN_ID}`]}>
      <Routes>
        <Route path="/admin/reposiciones/:id" element={<DetalleReposicionPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('DetalleReposicionPage (HU036 CA08/CA10)', () => {
  it('muestra el detalle con sus líneas y el botón de recepción', async () => {
    fetchMock.mockResolvedValue(envelope({ success: true, message: 'ok', data: ORDEN }));
    renderPage();

    expect(await screen.findByText(/Orden #AAAAAAA/i)).toBeInTheDocument();
    expect(screen.getByText('ZAP-NEG-42')).toBeInTheDocument();
    expect(screen.getByText('COLOR: Negro · SIZE: 42')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Confirmar Recepción de Mercadería/i })
    ).toBeInTheDocument();
  });

  it('confirma la recepción y muestra el mensaje de éxito', async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return Promise.resolve(
          envelope({
            success: true,
            message: 'ok',
            data: { id: ORDEN_ID, estado: 'RECIBIDO', lineas_actualizadas: 1, unidades_ingresadas: 5 },
          })
        );
      }
      return Promise.resolve(envelope({ success: true, message: 'ok', data: ORDEN }));
    });

    renderPage();
    await screen.findByText(/Orden #AAAAAAA/i);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Recepción de Mercadería/i }));

    expect(await screen.findByText(/5 unidad\(es\) sumadas al stock/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')).toBe(
        true
      );
    });
    expect(screen.getByText('Recibido')).toBeInTheDocument();
  });

  it('muestra el error de la API si la recepción falla', async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return Promise.resolve(
          envelope({
            success: false,
            error: { code: 'ORDEN_NO_PENDIENTE', message: 'La orden ya fue recibida', details: null },
          })
        );
      }
      return Promise.resolve(envelope({ success: true, message: 'ok', data: ORDEN }));
    });

    renderPage();
    await screen.findByText(/Orden #AAAAAAA/i);
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Recepción de Mercadería/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La orden ya fue recibida');
  });

  it('cancela la orden desde el modal con su motivo', async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return Promise.resolve(envelope({ success: true, message: 'ok', data: { ...ORDEN, estado: 'CANCELADO' } }));
      }
      return Promise.resolve(envelope({ success: true, message: 'ok', data: ORDEN }));
    });

    renderPage();
    await screen.findByText(/Orden #AAAAAAA/i);

    fireEvent.click(screen.getByRole('button', { name: /^Cancelar orden$/i }));

    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'proveedor sin stock' } });
    const botonConfirmar = dialogo.querySelectorAll('button');
    fireEvent.click(botonConfirmar[botonConfirmar.length - 1]);

    expect(await screen.findByText(/El stock de la tienda no se modificó/i)).toBeInTheDocument();
  });

  it('muestra el error de carga con reintento', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    renderPage();

    expect(await screen.findByText('No se pudo cargar la orden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
  });
});
