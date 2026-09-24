import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, Warehouse, Users, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StatCardSkeleton(): React.ReactElement {
  return (
    <div
      className="bg-canvas border border-hairline rounded-sm p-lg"
      aria-busy="true"
      aria-label="Cargando estadística"
    >
      <div className="flex items-start justify-between mb-md">
        <div className="w-8 h-8 rounded-xs bg-hairline-cool animate-pulse" />
        <div className="w-16 h-3 rounded-full bg-hairline-cool animate-pulse" />
      </div>
      <div className="w-20 h-6 rounded-sm bg-hairline-cool animate-pulse mb-xs" />
      <div className="w-28 h-2 rounded-full bg-hairline-cool animate-pulse" />
    </div>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string;
  sublabel: string;
  icon: LucideIcon;
}

// ─── Datos simulados (se reemplazarán con llamadas reales en HU analítico) ───

const STAT_CARDS: StatCard[] = [
  { label: 'Productos activos', value: '—',  sublabel: 'en catálogo',         icon: Package },
  { label: 'Pedidos hoy',       value: '—',  sublabel: 'desde medianoche',     icon: ShoppingCart },
  { label: 'Stock bajo',        value: '—',  sublabel: 'productos con alerta', icon: Warehouse },
  { label: 'Colaboradores',     value: '—',  sublabel: 'usuarios internos',    icon: Users },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export function DashboardPage(): React.ReactElement {
  const { usuario } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Simula la carga de datos del dashboard (500 ms)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>

      {/* Bienvenida */}
      <div className="mb-xxl">
        <div className="flex items-start justify-between gap-md">
          <div>
            <h1 className="text-heading-lg font-medium text-ink">
              Bienvenido, <span className="font-mono">{usuario?.email ?? '—'}</span>
            </h1>
            <p className="mt-xs text-sm text-ink-mute">Panel de control de VeroData Retail.</p>
          </div>
          <span className="shrink-0 font-mono text-xs bg-hairline-cool text-ink-mute px-xs py-xxs rounded-xs">
            {usuario?.rol}
          </span>
        </div>
        <div className="mt-md h-px bg-hairline" />
      </div>

      {/* Cards de resumen */}
      <section aria-label="Resumen de métricas">
        <h2 className="text-sm font-medium text-ink mb-lg">
          Métricas del sistema
        </h2>

        <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : STAT_CARDS.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="bg-canvas border border-hairline rounded-sm p-lg hover:border-hairline-strong transition-colors duration-150"
                  >
                    <div className="flex items-start justify-between mb-md">
                      <div className="w-8 h-8 rounded-xs bg-canvas-soft border border-hairline flex items-center justify-center">
                        <Icon size={15} className="text-ink-mute" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-mono text-ink-mute">{card.sublabel}</span>
                    </div>
                    <p className="text-display-md font-medium text-ink leading-none mb-xs tabular-nums">
                      {card.value}
                    </p>
                    <p className="text-xs text-ink-mute">{card.label}</p>
                  </div>
                );
              })}
        </div>
      </section>

      {/* Estado vacío — accesos rápidos */}
      <section className="mt-xxl" aria-label="Accesos rápidos">
        <h2 className="text-sm font-medium text-ink mb-lg">
          Accesos rápidos
        </h2>

        <div
          className={cn(
            'border border-dashed border-hairline-strong rounded-sm p-xxl',
            'flex flex-col items-center justify-center text-center gap-md'
          )}
        >
          <div className="w-10 h-10 rounded-sm bg-canvas-soft border border-hairline flex items-center justify-center" aria-hidden="true">
            <Package size={18} className="text-ink-faint" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Sin actividad reciente</p>
            <p className="text-xs text-ink-mute mt-xs max-w-xs">
              Agrega productos al catálogo o gestiona pedidos para ver actividad aquí.
            </p>
          </div>
          <a
            href="/admin/products"
            className={cn(
              'text-xs font-medium text-on-primary bg-primary px-sm py-xs rounded-xs',
              'hover:bg-primary-deep transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2'
            )}
          >
            Ir al catálogo
          </a>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
