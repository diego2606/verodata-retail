import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  rol: UserRole;
}

interface AuthState {
  token: string | null;
  usuario: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, usuario: AuthUser) => void;
  logout: () => void;
}

// ─── Helpers de persistencia ──────────────────────────────────────────────────

const TOKEN_KEY = 'verodata_token';
const USER_KEY  = 'verodata_user';

function persistSession(token: string, usuario: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function readSession(): { token: string; usuario: AuthUser } | null {
  const token   = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    const usuario = JSON.parse(userRaw) as AuthUser;
    return { token, usuario };
  } catch {
    return null;
  }
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = useState<AuthState>({
    token: null,
    usuario: null,
    isAuthenticated: false,
    isLoading: true, // true hasta que leamos localStorage
  });

  // Rehidratar sesión al montar
  useEffect(() => {
    const session = readSession();
    if (session) {
      setState({
        token: session.token,
        usuario: session.usuario,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback((token: string, usuario: AuthUser): void => {
    persistSession(token, usuario);
    setState({ token, usuario, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback((): void => {
    clearSession();
    setState({ token: null, usuario: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

