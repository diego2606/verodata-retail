import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SelectorUbicacion } from './SelectorUbicacion';
import type { DireccionItem } from '../../types/cuenta.types';

const mocks = vi.hoisted(() => ({
  listarDirecciones: vi.fn(),
  navigate: vi.fn(),
  abrirLogin: vi.fn(),
  autenticado: true,
}));

vi.mock('../../lib/cuenta', () => ({
  cuentaApi: { listarDirecciones: mocks.listarDirecciones },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mocks.autenticado }),
}));
vi.mock('../../context/LoginModalContext', () => ({
  useLoginModal: () => ({ abrirLogin: mocks.abrirLogin }),
}));

function direccion(
  id: string,
  distrito: string,
  extra: Partial<DireccionItem> = {}
): DireccionItem {
  return {
    id,
    usuario_id: 'u-1',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito,
    direccion_linea: 'Av. Larco 123',
    referencia: null,
    codigo_postal: null,
    latitud: null,
    longitud: null,
    es_principal: false,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

const miraflores = direccion('d-1', 'Miraflores', { es_principal: true });
const surco = direccion('d-2', 'Santiago de Surco', { direccion_linea: 'Av. Benavides 2000' });

const exitoso = (data: DireccionItem[]) => ({ success: true, message: 'ok', data });
const fallido = { success: false, error: { code: 'X', message: 'boom', details: null } };

function abrirPopover(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: /Entrega en/ }));
  return screen.getByRole('dialog');
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.autenticado = true;
  mocks.listarDirecciones.mockResolvedValue(exitoso([surco, miraflores]));
});

describe('SelectorUbicacion', () => {
  it('muestra la dirección principal por defecto en el header', async () => {
    render(<SelectorUbicacion />);

    expect(await screen.findByText('Miraflores')).toBeInTheDocument();
  });

  it('muestra un aviso mientras carga en lugar de una etiqueta falsa', () => {
    mocks.listarDirecciones.mockReturnValue(new Promise(() => undefined));
    render(<SelectorUbicacion />);

    expect(screen.getByRole('button', { name: /Cargando/ })).toBeInTheDocument();
  });

  it('abre el popover con las direcciones registradas y la principal preseleccionada', async () => {
    render(<SelectorUbicacion />);
    await screen.findByText('Miraflores');

    const dialogo = abrirPopover();

    expect(within(dialogo).getByText('Santiago de Surco')).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: /Miraflores/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(dialogo).getByRole('button', { name: /Santiago de Surco/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('filtra la lista por el buscador sin distinguir acentos', async () => {
    render(<SelectorUbicacion />);
    await screen.findByText('Miraflores');
    const dialogo = abrirPopover();

    fireEvent.change(within(dialogo).getByLabelText('Buscar distrito o dirección'), {
      target: { value: 'SANTIAGO' },
    });

    expect(within(dialogo).queryByText('Miraflores')).not.toBeInTheDocument();
    expect(within(dialogo).getByText('Santiago de Surco')).toBeInTheDocument();
  });

  it('avisa cuando la búsqueda no tiene resultados', async () => {
    render(<SelectorUbicacion />);
    await screen.findByText('Miraflores');
    const dialogo = abrirPopover();

    fireEvent.change(within(dialogo).getByLabelText('Buscar distrito o dirección'), {
      target: { value: 'Trujillo' },
    });

    expect(within(dialogo).getByText('Sin resultados')).toBeInTheDocument();
  });

  it('confirma la elección, actualiza el header y la persiste', async () => {
    render(<SelectorUbicacion />);
    await screen.findByText('Miraflores');
    const dialogo = abrirPopover();

    fireEvent.click(within(dialogo).getByRole('button', { name: /Santiago de Surco/ }));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar ubicación' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Santiago de Surco')).toBeInTheDocument();

    const guardado = localStorage.getItem('verodata_ubicacion_entrega');
    expect(guardado).not.toBeNull();
    expect(JSON.parse(guardado ?? '{}')).toEqual({
      direccionId: 'd-2',
      distrito: 'Santiago de Surco',
      provincia: 'Lima',
    });
  });

  it('cierra el popover con la tecla Escape', async () => {
    render(<SelectorUbicacion />);
    await screen.findByText('Miraflores');
    abrirPopover();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('invita a agregar una dirección cuando la libreta está vacía', async () => {
    mocks.listarDirecciones.mockResolvedValue(exitoso([]));
    render(<SelectorUbicacion />);

    const dialogo = abrirPopover();
    expect(await within(dialogo).findByText('Aún no tienes direcciones')).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: /Agregar dirección/ }));
    expect(mocks.navigate).toHaveBeenCalledWith('/cuenta/perfil?seccion=direcciones');
  });

  it('pide iniciar sesión cuando el visitante no está autenticado', async () => {
    mocks.autenticado = false;
    render(<SelectorUbicacion />);

    const dialogo = abrirPopover();
    expect(
      await within(dialogo).findByText('Inicia sesión para ver tus direcciones')
    ).toBeInTheDocument();
    expect(mocks.listarDirecciones).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ingresar' }));
    expect(mocks.abrirLogin).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar cuando falla la carga', async () => {
    mocks.listarDirecciones.mockResolvedValueOnce(fallido);
    render(<SelectorUbicacion />);

    const dialogo = abrirPopover();
    expect(await within(dialogo).findByText('No pudimos cargar tus direcciones.')).toBeInTheDocument();

    mocks.listarDirecciones.mockResolvedValue(exitoso([miraflores]));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reintentar' }));

    expect(await within(dialogo).findByText('Miraflores')).toBeInTheDocument();
  });
});
