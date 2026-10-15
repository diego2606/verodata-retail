import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, type AuthUser } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

const TOKEN_KEY = 'verodata_token';
const USER_KEY = 'verodata_user';

const admin: AuthUser = { id: 'u1', email: 'admin@verodata.com', rol: 'SUPER_ADMIN' };

function sembrarSesion(usuario: AuthUser): void {
  sessionStorage.setItem(TOKEN_KEY, 't');
  sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

function renderRutaProtegida() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/dashboard" element={<p>Panel de administración</p>} />
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

describe('ProtectedRoute', () => {
  it('redirige a /login cuando no hay sesión', async () => {
    renderRutaProtegida();

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.queryByText('Panel de administración')).not.toBeInTheDocument();
  });

  it('renderiza la vista protegida con sesión activa', async () => {
    sembrarSesion(admin);

    renderRutaProtegida();

    expect(await screen.findByText('Panel de administración')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument();
  });
});
