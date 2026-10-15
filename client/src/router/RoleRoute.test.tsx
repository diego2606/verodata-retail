import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, type AuthUser, type UserRole } from '../context/AuthContext';
import { RoleRoute } from './RoleRoute';

const TOKEN_KEY = 'verodata_token';
const USER_KEY = 'verodata_user';

function sembrarSesion(rol: UserRole): void {
  const usuario: AuthUser = { id: 'u1', email: 'user@verodata.com', rol };
  sessionStorage.setItem(TOKEN_KEY, 't');
  sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

function renderRutaPorRol(allowed: UserRole[]) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route element={<RoleRoute allowed={allowed} />}>
            <Route path="/admin/users" element={<p>Listado de colaboradores</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('RoleRoute (RBAC)', () => {
  it('permite el acceso cuando el rol está autorizado', async () => {
    sembrarSesion('SUPER_ADMIN');

    renderRutaPorRol(['SUPER_ADMIN']);

    expect(await screen.findByText('Listado de colaboradores')).toBeInTheDocument();
  });

  it('muestra el 403 y oculta la vista cuando el rol no está autorizado', async () => {
    sembrarSesion('ADMIN');

    renderRutaPorRol(['SUPER_ADMIN']);

    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument();
    expect(screen.queryByText('Listado de colaboradores')).not.toBeInTheDocument();
  });

  it('ofrece una salida al dashboard en el estado 403', async () => {
    sembrarSesion('ADMIN');

    renderRutaPorRol(['SUPER_ADMIN']);

    expect(await screen.findByRole('link', { name: 'Volver al dashboard' })).toHaveAttribute(
      'href',
      '/admin/dashboard'
    );
  });

  it('permite el acceso cuando el rol está entre varios autorizados', async () => {
    sembrarSesion('ADMIN');

    renderRutaPorRol(['SUPER_ADMIN', 'ADMIN']);

    expect(await screen.findByText('Listado de colaboradores')).toBeInTheDocument();
  });
});
