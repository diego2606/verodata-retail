import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApiData } from '../../lib/useApiData';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { EstadoError } from './Estados';
import type { CatalogoPaginado, CategoriaPublicaNodo } from '../../types/storefront.types';

interface VitrinaDepartamentosProps {
  categorias: CategoriaPublicaNodo[];
}

/** Vitrina por departamento con pestañas (HU013). */
export function VitrinaDepartamentos({ categorias }: VitrinaDepartamentosProps): React.ReactElement | null {
  const departamentos = categorias.slice(0, 6);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const activaId = seleccion ?? departamentos[0]?.id ?? null;

  const resultado = useApiData<CatalogoPaginado>(
    activaId !== null ? `/api/v1/storefront/products?categoria_id=${activaId}&limite=10` : null
  );

  if (departamentos.length === 0) return null;

  const activo = departamentos.find((d) => d.id === activaId);
  const items = resultado.estado.status === 'success' ? resultado.estado.data.items.slice(0, 5) : [];

  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-end justify-between gap-md">
        <h2 className="text-heading-lg font-semibold text-store-ink">Compra por departamento</h2>
        <Link to="/catalogo" className="flex items-center gap-xs text-sm font-medium text-store-accent hover:underline">
          Ver más <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-sm border-b border-store-line" role="tablist" aria-label="Departamentos">
        {departamentos.map((dep) => (
          <button
            key={dep.id}
            type="button"
            role="tab"
            aria-selected={activaId === dep.id}
            onClick={() => setSeleccion(dep.id)}
            className={cn(
              '-mb-px border-b-2 px-md py-sm text-sm font-medium transition-colors',
              activaId === dep.id ? 'border-store-ink text-store-ink' : 'border-transparent text-store-ink-mute hover:text-store-ink'
            )}
          >
            {dep.nombre}
          </button>
        ))}
      </div>

      {resultado.estado.status === 'loading' && (
        <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {resultado.estado.status === 'error' && (
        <EstadoError mensaje={resultado.estado.message} onReintentar={resultado.recargar} />
      )}

      {resultado.estado.status === 'success' && items.length === 0 && (
        <p className="rounded-lg border border-store-line bg-store-surface p-xl text-center text-sm text-store-ink-soft">
          Aún no hay productos en {activo?.nombre ?? 'este departamento'}.
        </p>
      )}

      {resultado.estado.status === 'success' && items.length > 0 && (
        <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-5">
          {items.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      )}
    </section>
  );
}
