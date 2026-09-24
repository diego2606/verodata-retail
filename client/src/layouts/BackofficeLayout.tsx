import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  onlyFor?: 'SUPER_ADMIN';
}

// ─── Constantes de navegación ─────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: '/admin/dashboard',  icon: LayoutDashboard },
  { label: 'Catálogo',   href: '/admin/products',   icon: Package },
  { label: 'Inventario', href: '/admin/inventory',  icon: Warehouse },
  { label: 'Pedidos',    href: '/admin/orders',     icon: ShoppingCart },
  { label: 'Usuarios',   href: '/admin/users',      icon: Users, onlyFor: 'SUPER_ADMIN' },
];

// ─── Subcomponentes ───────────────────────────────────────────────────────────

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
}

function SidebarLink({ item, collapsed }: SidebarLinkProps): React.ReactElement {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      end={item.href === '/admin/dashboard'}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-sm text-sm transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1',
          collapsed ? 'justify-center px-0 py-2' : 'gap-sm px-3 py-2',
          isActive
            ? 'bg-primary/10 text-ink font-medium'
            : 'text-ink-mute hover:bg-hairline-cool hover:text-ink'
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon size={16} className="shrink-0" aria-hidden="true" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function BackofficeLayout(): React.ReactElement {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter(
    item => !item.onlyFor || item.onlyFor === usuario?.rol
  );

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="h-12 bg-canvas border-b border-hairline flex items-center px-xl gap-md shrink-0 z-10">
        {/* Toggle sidebar */}
        <button
          type="button"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="text-ink-mute hover:text-ink transition-colors p-xs rounded-xs focus-visible:outline-2 focus-visible:outline-primary"
        >
          {collapsed
            ? <Menu size={16} aria-hidden="true" />
            : <X size={16} aria-hidden="true" />}
        </button>

        {/* Brand */}
        <div className="flex items-center gap-xs">
          <span className="inline-block w-5 h-5 rounded-xs bg-canvas-night flex items-center justify-center shrink-0" aria-hidden="true">
            <span className="text-primary font-mono font-bold text-xs leading-none">V</span>
          </span>
          {!collapsed && (
            <span className="text-xs font-medium text-ink tracking-tight">VeroData Retail</span>
          )}
        </div>

        <span className="text-hairline-strong text-xs" aria-hidden="true">|</span>
        <span className="text-xs text-ink-mute hidden sm:block">
          Backoffice
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Usuario logueado */}
        {usuario && (
          <div className="flex items-center gap-xs">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-ink leading-none">{usuario.email}</p>
              <p className="text-xs text-ink-mute font-mono mt-xxs">{usuario.rol}</p>
            </div>
            <div
              className="w-7 h-7 rounded-sm bg-canvas-night flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <span className="text-primary font-mono text-xs font-bold leading-none">
                {usuario.email.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside
          className={cn(
            'bg-canvas border-r border-hairline flex flex-col shrink-0 transition-all duration-200',
            collapsed ? 'w-12' : 'w-52'
          )}
          aria-label="Navegación principal"
        >
          <nav className="flex-1 px-sm py-md overflow-y-auto">
            <ul className="space-y-1.5" role="list">
              {visibleItems.map(item => (
                <li key={item.href}>
                  <SidebarLink item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="px-sm py-md border-t border-hairline">
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'flex items-center rounded-sm w-full text-sm',
                collapsed ? 'justify-center px-0 py-2' : 'gap-sm px-3 py-2',
                'text-ink-mute hover:bg-retail-red/8 hover:text-retail-red transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-retail-red focus-visible:outline-offset-1'
              )}
              title={collapsed ? 'Cerrar sesión' : undefined}
            >
              <LogOut size={16} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span>Cerrar sesión</span>}
            </button>
          </div>
        </aside>

        {/* ── Contenido principal ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto" role="main">
          {/* Breadcrumb strip */}
          <div className="h-9 bg-canvas border-b border-hairline-cool flex items-center px-xl gap-xs">
            <ChevronRight size={12} className="text-ink-faint" aria-hidden="true" />
            <span className="text-xs text-ink-mute font-mono">admin</span>
          </div>

          {/* Outlet — páginas hijas */}
          <div className="p-xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default BackofficeLayout;
