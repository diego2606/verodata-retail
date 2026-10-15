import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { ColoresProvider } from '../context/ColoresContext';
import { useAuth } from '../context/AuthContext';
import { useLoginModal } from '../context/LoginModalContext';
import { PerfilIncompletoBanner } from '../components/storefront/PerfilIncompletoBanner';
import { MegaMenu } from '../components/storefront/MegaMenu';
import { CONTENEDOR_TIENDA } from '../lib/utils';

const CONTENEDOR = CONTENEDOR_TIENDA;

/**
 * Layout del Storefront público (modo `Persuade`).
 * Header de 3 niveles según `skills/ui-storefront-retail.md`.
 */
export function StorefrontLayout(): React.ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated, usuario, logout } = useAuth();
  const { abrirLogin } = useLoginModal();
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  function buscar(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const query = busqueda.trim();
    // S9383: en react-router v7 navigate() puede devolver una promesa; `void`
    // deja explícito que el fire-and-forget es intencional.
    void navigate(query ? `/catalogo?search=${encodeURIComponent(query)}` : '/catalogo');
  }

  function cerrarSesion(): void {
    logout();
    void navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col bg-store-canvas text-store-ink">
      {/* Nivel 1 — Utility bar */}
      <div className="border-b border-store-line bg-store-surface">
        <div className={`${CONTENEDOR} flex h-8 items-center justify-between text-xs text-store-ink-soft`}>
          <nav className="flex items-center gap-lg" aria-label="Enlaces de ayuda">
            <Link to="/catalogo" className="hover:text-store-ink">Ayuda</Link>
            <Link to="/catalogo" className="hover:text-store-ink">Cambios y devoluciones</Link>
            <Link to="/catalogo" className="hover:text-store-ink">Venta telefónica</Link>
          </nav>
          {isAuthenticated ? (
            <div className="flex items-center gap-lg">
              <Link to="/cuenta/perfil" className="font-medium hover:text-store-accent">Mi cuenta</Link>
              <button type="button" onClick={cerrarSesion} className="hover:text-store-ink">Salir</button>
            </div>
          ) : (
            <button type="button" onClick={abrirLogin} className="font-medium hover:text-store-accent">Ingresar</button>
          )}
        </div>
      </div>

      {/* Nivel 2 — Main navigation */}
      <header className="sticky top-0 z-30 border-b border-store-line bg-store-surface">
        <div className="flex h-16 w-full items-center gap-lg px-lg md:px-10 lg:h-[88px] lg:gap-[58px] lg:px-16">
          {/* Marca */}
          <Link to="/" className="flex shrink-0 items-center" aria-label="VeroData Retail, ir al inicio">
            <img src="/brand/logo-verodata.svg" alt="VeroData Retail" className="h-9 w-auto lg:h-10" />
          </Link>

          {/* Buscador (ocupa el ancho disponible) */}
          <form onSubmit={buscar} role="search" className="hidden flex-1 md:block">
            <div className="flex h-12 items-center gap-md rounded-full border border-store-line bg-store-canvas pl-5 pr-1 transition-colors focus-within:border-store-ink-mute">
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar en verodata.com"
                aria-label="Buscar productos"
                className="h-full flex-1 bg-transparent text-sm text-store-ink outline-none placeholder:text-store-ink-soft"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-store-ink text-white transition-colors hover:bg-store-ink/90"
              >
                <Search size={20} aria-hidden="true" />
              </button>
            </div>
          </form>

          {/* Cuenta y bolsa */}
          <div className="ml-auto flex items-center gap-7">
            {isAuthenticated && usuario ? (
              <Link to="/cuenta/perfil" className="flex items-center gap-sm" aria-label="Mi cuenta">
                <User size={24} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-store-ink" />
                <span className="flex flex-col text-left">
                  <span className="text-xs leading-tight text-store-ink-soft">
                    Hola, {usuario.nombre ?? usuario.email}
                  </span>
                  <span className="text-sm font-semibold leading-tight text-store-ink">Mi cuenta</span>
                </span>
              </Link>
            ) : (
              <button type="button" onClick={abrirLogin} className="flex items-center gap-sm" aria-label="Acceso">
                <User size={24} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-store-ink" />
                <span className="hidden flex-col text-left sm:flex">
                  <span className="text-xs leading-tight text-store-ink-soft">Invitado</span>
                  <span className="text-sm font-semibold leading-tight text-store-ink">Acceso</span>
                </span>
              </button>
            )}

            <Link to="/catalogo" className="relative flex items-center" aria-label="Bolsa de compras">
              <ShoppingBag size={25} strokeWidth={1.5} aria-hidden="true" className="text-store-ink" />
              <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-store-accent px-xs font-mono text-[10px] font-bold leading-none text-white">
                0
              </span>
            </Link>
          </div>
        </div>

        {/* Nivel 3 — Sub-bar de ubicación */}
        <div className="border-t border-store-line bg-store-surface">
          <div className={`${CONTENEDOR} flex h-10 items-center justify-between text-sm`}>
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-haspopup="true"
              className="flex items-center gap-sm font-medium text-store-ink"
            >
              <Menu size={18} aria-hidden="true" />
              Todas las categorías
            </button>
            <button
              type="button"
              className="flex items-center gap-sm text-store-ink-soft hover:text-store-ink"
              title="Selector de distrito (próximamente)"
            >
              <MapPin size={16} aria-hidden="true" />
              Entrega en: <span className="font-medium text-store-ink">Lima</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {menuAbierto && <MegaMenu onClose={() => setMenuAbierto(false)} />}
      </header>

      {menuAbierto && (
        <div
          className="fixed inset-0 z-20 bg-ink/20"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      <PerfilIncompletoBanner />

      <main className="flex-1">
        <ColoresProvider>
          <Outlet />
        </ColoresProvider>
      </main>

      <footer className="mt-huge border-t border-store-line bg-store-surface">
        <div className={`${CONTENEDOR} grid gap-xl py-xxl md:grid-cols-4`}>
          <div className="flex flex-col gap-sm">
            <span className="text-lg font-bold">VeroData</span>
            <p className="text-sm text-store-ink-soft">
              Calzado, indumentaria y accesorios con envíos a todo el Perú.
            </p>
          </div>
          <FooterColumna titulo="Comprar" enlaces={[
            { label: 'Todo el catálogo', to: '/catalogo' },
            { label: 'Ofertas', to: '/catalogo' },
          ]} />
          <FooterColumna titulo="Ayuda" enlaces={[
            { label: 'Cambios y devoluciones', to: '/catalogo' },
            { label: 'Rastrea tu pedido', to: '/catalogo' },
          ]} />
          <div className="flex flex-col gap-sm">
            <span className="text-sm font-semibold text-store-ink">Pagos</span>
            <p className="text-sm text-store-ink-soft">Yape · Plin · Tarjetas · Transferencia</p>
          </div>
        </div>
        <div className="border-t border-store-line">
          <div className={`${CONTENEDOR} py-lg text-xs text-store-ink-mute`}>
            © {new Date().getFullYear()} VeroData Retail S.A.C. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FooterColumnaProps {
  titulo: string;
  enlaces: Array<{ label: string; to: string }>;
}

function FooterColumna({ titulo, enlaces }: FooterColumnaProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-sm">
      <span className="text-sm font-semibold text-store-ink">{titulo}</span>
      <nav className="flex flex-col gap-xs">
        {enlaces.map((enlace) => (
          <Link key={enlace.label} to={enlace.to} className="text-sm text-store-ink-soft hover:text-store-ink">
            {enlace.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
