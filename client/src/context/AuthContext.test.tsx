import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, type AuthUser } from './AuthContext';

const TOKEN_KEY = 'verodata_token';
const USER_KEY = 'verodata_user';

const usuario: AuthUser = { id: 'u1', email: 'admin@verodata.com', rol: 'SUPER_ADMIN' };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

function montar() {
  return renderHook(() => useAuth(), { wrapper });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('AuthProvider', () => {
  it('termina la carga sin sesión cuando no hay nada persistido', async () => {
    const { result } = montar();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.usuario).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('persiste en sessionStorage cuando no se marca "recordar"', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.login('t-sesion', usuario));

    expect(result.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('t-sesion');
    expect(sessionStorage.getItem(USER_KEY)).toBe(JSON.stringify(usuario));
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('persiste en localStorage cuando se marca "recordar"', async () => {
    const { result } = montar();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.login('t-recordado', usuario, true));

    expect(localStorage.getItem(TOKEN_KEY)).toBe('t-recordado');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('limpia la sesión previa del otro storage al iniciar sesión', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-viejo');
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));

    const { result } = montar();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.login('t-nuevo', usuario));

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('t-nuevo');
  });

  it('cierra sesión y limpia ambos storages', async () => {
    localStorage.setItem(TOKEN_KEY, 't');
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));

    const { result } = montar();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.logout());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.usuario).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('rehidrata la sesión recordada al montar', async () => {
    localStorage.setItem(TOKEN_KEY, 't-rec');
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));

    const { result } = montar();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.token).toBe('t-rec');
    expect(result.current.usuario).toEqual(usuario);
    expect(result.current.isLoading).toBe(false);
  });

  it('rehidrata la sesión de pestaña al montar', async () => {
    sessionStorage.setItem(TOKEN_KEY, 't-tab');
    sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));

    const { result } = montar();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.token).toBe('t-tab');
  });

  it('no autentica si falta el usuario persistido', async () => {
    localStorage.setItem(TOKEN_KEY, 't-huerfano');

    const { result } = montar();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('no autentica si el usuario persistido está corrupto', async () => {
    localStorage.setItem(TOKEN_KEY, 't');
    localStorage.setItem(USER_KEY, '{esto-no-es-json');

    const { result } = montar();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('useAuth lanza si se usa fuera del AuthProvider', () => {
    const silenciar = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth debe usarse dentro de <AuthProvider>'
    );

    silenciar.mockRestore();
  });
});
