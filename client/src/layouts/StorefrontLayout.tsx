import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { ColoresProvider } from '../context/ColoresContext';
import { useAuth } from '../context/AuthContext';

const CONTENEDOR = 'mx-auto w-full max-w-[1200px] px-lg';

/**
 * Layout del Storefront público (modo `Persuade`).
 * Header de 3 niveles según `skills/ui-storefront-retail.md`.
 */
export function StorefrontLayout(): React.ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated, usuario, logout } = useAuth();
  const [busqueda, setBusqueda] = useState('');

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
            <Link to="/cuenta/ingresar" className="font-medium hover:text-store-accent">Ingresar</Link>
          )}
        </div>
      </div>

      {/* Nivel 2 — Main navigation */}
      <header className="sticky top-0 z-30 border-b border-store-line bg-store-surface">
        <div className={`${CONTENEDOR} flex h-16 items-center gap-lg`}>
          <Link to="/" className="text-xl font-bold tracking-tight text-store-ink" aria-label="VeroData Retail, ir al inicio">
            VeroData
          </Link>

          <form onSubmit={buscar} role="search" className="hidden flex-1 md:block">
            <div className="flex h-10 items-center overflow-hidden rounded-full border border-store-line bg-store-canvas focus-within:border-store-ink-mute">
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar zapatillas, polos, mochilas…"
                aria-label="Buscar productos"
                className="h-full flex-1 bg-transparent px-lg text-sm text-store-ink outline-none placeholder:text-store-ink-mute"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="mr-xxs flex h-8 w-8 items-center justify-center rounded-full bg-store-ink text-white"
              >
                <Search size={16} aria-hidden="true" />
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-lg">
            <Link
              to={isAuthenticated ? '/cuenta/perfil' : '/cuenta/ingresar'}
              className="hidden items-center gap-sm text-sm text-store-ink-soft hover:text-store-ink lg:flex"
            >
              <User size={18} aria-hidden="true" />
              {isAuthenticated && usuario ? `Hola, ${usuario.nombre ?? usuario.email}` : 'Hola, invitado'}
            </Link>
            <Link to="/catalogo" className="relative flex items-center" aria-label="Bolsa de compras">
              <ShoppingBag size={22} aria-hidden="true" />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-store-accent px-xs text-xs font-semibold text-white">
                0
              </span>
            </Link>
          </div>
        </div>

        {/* Nivel 3 — Sub-bar de ubicación */}
        <div className="border-t border-store-line bg-store-surface">
          <div className={`${CONTENEDOR} flex h-10 items-center justify-between text-sm`}>
            <Link to="/catalogo" className="flex items-center gap-sm font-medium text-store-ink">
              <Menu size={18} aria-hidden="true" />
              Todas las categorías
            </Link>
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
      </header>

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
