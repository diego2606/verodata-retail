import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NuevaReposicionPage } from './NuevaReposicionPage';
import type { ProveedorItem } from '../../../types/reposicion.types';
import type { ProductoItem } from '../../../types/product.types';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function envelope(payload: unknown): Response {
  return { status: 200, json: () => Promise.resolve(payload) } as unknown as Response;
}

const PROVEEDOR: ProveedorItem = {
  id: '11111111-1111-1111-1111-111111111111',
  nombre_empresa: 'Distribuidora Andina',
  contacto_nombre: null,
  telefono: null,
  email: null,
  categoria_productos: null,
  activo: true,
  creado_en: '2026-10-01T00:00:00.000Z',
  actualizado_en: '2026-10-01T00:00:00.000Z',
};

const PRODUCTO: ProductoItem = {
  id: '22222222-2222-2222-2222-222222222222',
  categoria_id: 1,
  categoria_nombre: 'Zapatillas',
  sku: 'SKU-1',
  nombre: 'Zapatilla Runner',
  descripcion: null,
  precio_regular: 89.99,
  precio_oferta: null,
  imagen_url: null,
  modelo: null,
  atributos: {},
  activo: true,
  stock_actual: 3,
  stock_minimo: 5,
  creado_en: '2026-10-01T00:00:00.000Z',
  actualizado_en: '2026-10-01T00:00:00.000Z',
};

const PRODUCTO_2: ProductoItem = { ...PRODUCTO, id: '33333333-3333-3333-3333-333333333333', sku: 'SKU-2', nombre: 'Zapatilla Urban' };

function exitoTodo(): void {
  fetchMock.mockImplementation((url: string) => {
    if (String(url).includes('/api/v1/proveedores')) {
      return Promise.resolve(envelope({ success: true, message: 'ok', data: [PROVEEDOR] }));
    }
    if (String(url).includes('/api/v1/products')) {
      return Promise.resolve(envelope({ success: true, message: 'ok', data: [PRODUCTO, PRODUCTO_2] }));
    }
    return Promise.resolve(
      envelope({ success: true, message: 'ok', data: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' } })
    );
  });
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/admin/reposiciones/nueva']}>
      <Routes>
        <Route path="/admin/reposiciones/nueva" element={<NuevaReposicionPage />} />
        <Route path="/admin/reposiciones/:id" element={<div>Detalle de la orden</div>} />
      </Routes>
    </MemoryRouter>
  );
}

/** Selecciona una opción del listbox propio a partir del combobox indicado. */
function elegirEnCombobox(indice: number, texto: RegExp): void {
  fireEvent.click(screen.getAllByRole('combobox')[indice]);
  fireEvent.click(screen.getByRole('option', { name: texto }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  exitoTodo();
});

describe('NuevaReposicionPage (HU036 CA02/CA10)', () => {
  it('carga proveedores y productos', async () => {
    renderPage();
    expect(await screen.findByLabelText('Proveedor de la orden')).toBeInTheDocument();
    expect(screen.getByText('Aún no agregaste productos a esta orden.')).toBeInTheDocument();
  });

  it('agrega líneas y recalcula subtotal y total en vivo', async () => {
    renderPage();
    await screen.findByLabelText('Proveedor de la orden');

    fireEvent.click(screen.getByRole('button', { name: /Agregar producto/i }));
    elegirEnCombobox(1, /SKU-1/);

    fireEvent.change(screen.getByLabelText('Costo unitario'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Cantidad pedida'), { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getAllByText(/20\.00/).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('permite quitar líneas y deshabilita el borrado cuando queda una sola', async () => {
    renderPage();
    await screen.findByLabelText('Proveedor de la orden');

    fireEvent.click(screen.getByRole('button', { name: /Agregar producto/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar producto/i }));
    expect(screen.getAllByRole('button', { name: 'Quitar línea' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar línea' })[0]);
    expect(screen.getAllByRole('button', { name: 'Quitar línea' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Quitar línea' })).toBeDisabled();
  });

  it('valida que haya proveedor antes de guardar', async () => {
    renderPage();
    await screen.findByLabelText('Proveedor de la orden');

    fireEvent.click(screen.getByRole('button', { name: /Guardar orden/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Selecciona un proveedor para la orden.');
  });

  it('valida que cada línea tenga producto', async () => {
    renderPage();
    await screen.findByLabelText('Proveedor de la orden');
    elegirEnCombobox(0, /Distribuidora Andina/);
    fireEvent.click(screen.getByRole('button', { name: /Agregar producto/i }));

    fireEvent.click(screen.getByRole('button', { name: /Guardar orden/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Selecciona un producto en cada línea.');
  });

  it('guarda la orden con el payload calculado y navega al detalle', async () => {
    renderPage();
    await screen.findByLabelText('Proveedor de la orden');

    elegirEnCombobox(0, /Distribuidora Andina/);
    fireEvent.click(screen.getByRole('button', { name: /Agregar producto/i }));
    elegirEnCombobox(1, /SKU-1/);
    fireEvent.change(screen.getByLabelText('Costo unitario'), { target: { value: '12.5' } });
    fireEvent.change(screen.getByLabelText('Cantidad pedida'), { target: { value: '4' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar orden/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse(String((post?.[1] as RequestInit).body))).toEqual({
        proveedor_id: PROVEEDOR.id,
        fecha_estimada_arribo: null,
        notas: null,
        detalles: [{ producto_id: PRODUCTO.id, costo_unitario: 12.5, cantidad_pedida: 4 }],
      });
    });
  });

  it('muestra el error del servidor al guardar', async () => {
    renderPage();
    await screen.findByLabelText('Proveedor de la orden');

    elegirEnCombobox(0, /Distribuidora Andina/);
    fireEvent.click(screen.getByRole('button', { name: /Agregar producto/i }));
    elegirEnCombobox(1, /SKU-1/);

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if ((init as RequestInit | undefined)?.method === 'POST') {
        return Promise.resolve(
          envelope({ success: false, error: { code: 'PRODUCTO_NOT_FOUND', message: 'Producto inexistente', details: null } })
        );
      }
      if (String(url).includes('/api/v1/proveedores')) {
        return Promise.resolve(envelope({ success: true, message: 'ok', data: [PROVEEDOR] }));
      }
      return Promise.resolve(envelope({ success: true, message: 'ok', data: [PRODUCTO, PRODUCTO_2] }));
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar orden/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Producto inexistente');
  });

  it('muestra el error de carga inicial con reintento', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    renderPage();

    expect(await screen.findByText('No se pudo cargar el formulario')).toBeInTheDocument();

    exitoTodo();
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(await screen.findByLabelText('Proveedor de la orden')).toBeInTheDocument();
  });
});
