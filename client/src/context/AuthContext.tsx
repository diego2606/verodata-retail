import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENTE';

export interface AuthUser {
  id: string;
  email: string;
  rol: UserRole;
  /** Nombre para mostrar (clientes). Puede ser null. */
  nombre?: string | null;
}

interface AuthState {
  token: string | null;
  usuario: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, usuario: AuthUser, recordar?: boolean) => void;
  logout: () => void;
  /** Refresca los datos del usuario en memoria y en el almacenamiento. */
  actualizarSesion: (usuario: AuthUser) => void;
}

// ─── Helpers de persistencia ──────────────────────────────────────────────────

const TOKEN_KEY = 'verodata_token';
const USER_KEY  = 'verodata_user';

/** Persiste la sesión: `localStorage` si "recordar", `sessionStorage` si no. */
function persistSession(token: string, usuario: AuthUser, recordar: boolean): void {
  clearSession();
  const store = recordar ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(usuario));
}

function clearSession(): void {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
  }
}

function readSession(): { token: string; usuario: AuthUser } | null {
  const token   = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
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

  const login = useCallback((token: string, usuario: AuthUser, recordar = false): void => {
    persistSession(token, usuario, recordar);
    setState({ token, usuario, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback((): void => {
    clearSession();
    setState({ token: null, usuario: null, isAuthenticated: false, isLoading: false });
  }, []);

  const actualizarSesion = useCallback((usuario: AuthUser): void => {
    const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
    store.setItem(USER_KEY, JSON.stringify(usuario));
    setState((prev) => ({ ...prev, usuario }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, actualizarSesion }}>
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

