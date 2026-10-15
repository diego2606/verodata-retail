import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { LoginClienteForm } from '../components/storefront/LoginClienteForm';

interface LoginModalValue {
  abrirLogin: () => void;
  cerrarLogin: () => void;
}

const LoginModalContext = createContext<LoginModalValue | null>(null);

/**
 * Modal global de acceso del cliente. Se abre desde el header o desde
 * cualquier CTA (`useLoginModal().abrirLogin()`), sin navegar a otra página.
 */
export function LoginModalProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [abierto, setAbierto] = useState(false);
  const abrirLogin = useCallback(() => setAbierto(true), []);
  const cerrarLogin = useCallback(() => setAbierto(false), []);

  return (
    <LoginModalContext.Provider value={{ abrirLogin, cerrarLogin }}>
      {children}
      {abierto && (
        <Modal
          onClose={cerrarLogin}
          labelledBy="login-modal-titulo"
          panelClassName="max-w-[420px] rounded-lg border-store-line"
        >
          <h2 id="login-modal-titulo" className="text-heading-md font-semibold text-store-ink">
            Ingresar a mi cuenta
          </h2>
          <p className="mt-xs text-sm text-store-ink-soft">Gestiona tus pedidos, direcciones y datos.</p>
          <div className="mt-lg">
            <LoginClienteForm onCerrar={cerrarLogin} />
          </div>
        </Modal>
      )}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal(): LoginModalValue {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal debe usarse dentro de <LoginModalProvider>');
  return ctx;
}
