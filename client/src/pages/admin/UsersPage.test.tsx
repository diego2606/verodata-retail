import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UsersPage } from './UsersPage';
import type { UsuarioListItem } from '../../types/user.types';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ usuario: { id: 'u-jefe', rol: 'SUPER_ADMIN' } }),
}));

const USUARIOS: UsuarioListItem[] = [
  {
    id: 'u-admin',
    email: 'ana.admin@verodata.com',
    rol: 'ADMIN',
    bloqueado: false,
    intentos_fallidos: 0,
    tipo_documento: 'DNI',
    numero_documento: '11111111',
    nombres: 'Ana',
    apellidos: 'Pérez',
    telefono: null,
    creado_en: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u-jefe',
    email: 'jefe@verodata.com',
    rol: 'SUPER_ADMIN',
    bloqueado: false,
    intentos_fallidos: 0,
    tipo_documento: 'DNI',
    numero_documento: '22222222',
    nombres: 'Diego',
    apellidos: 'Velásquez',
    telefono: null,
    creado_en: '2026-01-01T00:00:00.000Z',
  },
];

const fetchMock = vi.fn();

function respuesta(payload: unknown): Response {
  return { status: 200, json: () => Promise.resolve(payload) } as unknown as Response;
}

function ok<T>(data: T): Response {
  return respuesta({ success: true, message: 'ok', data });
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string) => {
    const destino = String(url);
    if (destino.includes('/password')) {
      return Promise.resolve(ok({ id: 'u-admin' }));
    }
    return Promise.resolve(ok(USUARIOS));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>
  );
}

/** Fila de la tabla que contiene ese email. */
function filaDe(email: string): HTMLElement {
  return screen.getByText(email).closest('tr') as HTMLElement;
}

describe('UsersPage — cambio de contraseña', () => {
  it('ofrece cambiar la contraseña de un ADMIN', async () => {
    renderPage();
    await screen.findByText('ana.admin@verodata.com');

    const boton = within(filaDe('ana.admin@verodata.com')).getByRole('button', {
      name: 'Contraseña',
    });

    expect(boton).toBeEnabled();
  });

  it('no permite cambiar la contraseña de un SUPER_ADMIN', async () => {
    renderPage();
    await screen.findByText('jefe@verodata.com');

    const boton = within(filaDe('jefe@verodata.com')).getByRole('button', { name: 'Contraseña' });

    expect(boton).toBeDisabled();
  });

  it('no permite bloquear a un SUPER_ADMIN', async () => {
    renderPage();
    await screen.findByText('jefe@verodata.com');

    const boton = within(filaDe('jefe@verodata.com')).getByRole('button', { name: 'Bloquear' });

    expect(boton).toBeDisabled();
  });

  it('envía la nueva contraseña al endpoint correcto', async () => {
    renderPage();
    await screen.findByText('ana.admin@verodata.com');

    fireEvent.click(
      within(filaDe('ana.admin@verodata.com')).getByRole('button', { name: 'Contraseña' })
    );

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'NuevaClave1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'NuevaClave1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(([url]) => String(url).includes('/password'));
      expect(llamada).toBeDefined();
      expect(String(llamada?.[0])).toContain('/api/v1/users/u-admin/password');
      expect(JSON.parse(String((llamada?.[1] as RequestInit).body))).toEqual({
        password: 'NuevaClave1',
      });
    });
  });

  it('no envía nada si las contraseñas no coinciden', async () => {
    renderPage();
    await screen.findByText('ana.admin@verodata.com');

    fireEvent.click(
      within(filaDe('ana.admin@verodata.com')).getByRole('button', { name: 'Contraseña' })
    );

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'NuevaClave1' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'OtraClave2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/password'))).toBe(false);
  });

  it('exige la política mínima de contraseña', async () => {
    renderPage();
    await screen.findByText('ana.admin@verodata.com');

    fireEvent.click(
      within(filaDe('ana.admin@verodata.com')).getByRole('button', { name: 'Contraseña' })
    );

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'debil' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'debil' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/password'))
    ).toBe(false);
  });
});
