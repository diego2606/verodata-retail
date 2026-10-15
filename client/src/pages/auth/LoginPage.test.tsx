import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { LoginPage } from './LoginPage';

const TOKEN_KEY = 'verodata_token';
const USER_KEY = 'verodata_user';

const ESTADO_OK = {
  success: true,
  message: 'ok',
  data: {
    version: '1.4.2',
    db: 'ok',
    latencyMs: 37,
    categoriasActivas: 9,
    productosActivos: 148,
    uptimeSeconds: 3600,
  },
};

const LOGIN_OK = {
  success: true,
  message: 'ok',
  data: {
    token: 'jwt-de-prueba',
    usuario: { id: 'u1', email: 'admin@verodata.com', rol: 'SUPER_ADMIN' },
  },
};

type EscenarioLogin =
  | { tipo: 'exito' }
  | { tipo: 'error-negocio'; code: string; message: string }
  | { tipo: 'rechazo-red' };

const fetchMock = vi.fn();

function respuesta(payload: unknown, status = 200): Response {
  return { status, json: () => Promise.resolve(payload) } as unknown as Response;
}

function stubFetch(login: EscenarioLogin = { tipo: 'exito' }, estado: 'ok' | 'error' = 'ok'): void {
  fetchMock.mockImplementation((url: string) => {
    const destino = String(url);

    if (destino.includes('/api/v1/status')) {
      return estado === 'ok'
        ? Promise.resolve(respuesta(ESTADO_OK))
        : Promise.reject(new TypeError('Failed to fetch'));
    }

    switch (login.tipo) {
      case 'exito':
        return Promise.resolve(respuesta(LOGIN_OK));
      case 'error-negocio':
        return Promise.resolve(
          respuesta({
            success: false,
            error: { code: login.code, message: login.message, details: null },
          })
        );
      case 'rechazo-red':
        return Promise.reject(new TypeError('Failed to fetch'));
    }
  });
}

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<p>Panel de administración</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

function completar(email = 'admin@verodata.com', password = 'Admin1234!'): void {
  fireEvent.change(screen.getByLabelText('Correo institucional'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
}

function enviar(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

function cuerpoDelLogin(): Record<string, unknown> {
  const llamada = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/v1/auth/login'));
  expect(llamada, 'no se llamó a /auth/login').toBeDefined();
  return JSON.parse((llamada![1] as RequestInit).body as string) as Record<string, unknown>;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('valida el formulario sin llamar a la API', async () => {
    stubFetch();
    renderLogin();

    completar('correo-invalido', 'corta');
    enviar();

    expect(await screen.findByText('Ingresa un correo electrónico válido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/auth/login'))).toBe(false);
  });

  it('envía las credenciales, guarda la sesión y redirige al dashboard', async () => {
    stubFetch();
    renderLogin();

    completar();
    enviar();

    expect(await screen.findByText('Panel de administración')).toBeInTheDocument();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('jwt-de-prueba');
    expect(cuerpoDelLogin()).toEqual({
      email: 'admin@verodata.com',
      password: 'Admin1234!',
      recordar: false,
    });
  });

  it('persiste la sesión en localStorage cuando se marca "Recordarme"', async () => {
    stubFetch();
    renderLogin();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Recordarme' }));
    completar();
    enviar();

    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-de-prueba'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(cuerpoDelLogin().recordar).toBe(true);
    expect(JSON.parse(localStorage.getItem(USER_KEY) as string)).toMatchObject({
      email: 'admin@verodata.com',
      rol: 'SUPER_ADMIN',
    });
  });

  it('muestra el modal de seguridad ante MAX_LOGIN_ATTEMPTS (CA04)', async () => {
    stubFetch({ tipo: 'error-negocio', code: 'MAX_LOGIN_ATTEMPTS', message: 'bloqueado' });
    renderLogin();

    completar();
    enviar();

    expect(await screen.findByText('Acceso bloqueado preventivamente')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('cierra el modal de seguridad con la opción de esperar', async () => {
    stubFetch({ tipo: 'error-negocio', code: 'MAX_LOGIN_ATTEMPTS', message: 'bloqueado' });
    renderLogin();

    completar();
    enviar();
    await screen.findByText('Acceso bloqueado preventivamente');

    fireEvent.click(screen.getByRole('button', { name: 'Esperar e intentar de nuevo' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Acceso bloqueado preventivamente')).not.toBeInTheDocument();
  });

  it('muestra el error de negocio devuelto por la API', async () => {
    stubFetch({ tipo: 'error-negocio', code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' });
    renderLogin();

    completar();
    enviar();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Credenciales incorrectas');
  });

  it('muestra el error de conexión cuando falla la red', async () => {
    stubFetch({ tipo: 'rechazo-red' });
    renderLogin();

    completar();
    enviar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor');
  });

  it('alterna la visibilidad de la contraseña', () => {
    stubFetch();
    renderLogin();

    const campo = screen.getByLabelText('Contraseña');
    expect(campo).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeInTheDocument();
  });

  it('muestra las tarjetas de estado del sistema cuando responde', async () => {
    stubFetch();
    renderLogin();

    expect(await screen.findByText('148')).toBeInTheDocument();
    expect(screen.getByText('9 categorías activas')).toBeInTheDocument();
    expect(screen.getByText('37 ms')).toBeInTheDocument();
    expect(screen.getByText('Base de datos operativa')).toBeInTheDocument();
    expect(screen.getByText('Todos los sistemas operativos')).toBeInTheDocument();
    expect(screen.getByText('v1.4.2')).toBeInTheDocument();
  });

  it('degrada las tarjetas de estado si falla la consulta', async () => {
    stubFetch({ tipo: 'exito' }, 'error');
    renderLogin();

    await waitFor(() => expect(screen.getAllByText('No disponible')).toHaveLength(2));
    expect(screen.getByText('Servicio degradado')).toBeInTheDocument();
  });

  it('revela el mensaje de ayuda de contraseña', () => {
    stubFetch();
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));

    expect(
      screen.getByText('Solicita el restablecimiento de tu contraseña a un Super Administrador.')
    ).toBeInTheDocument();
  });
});
