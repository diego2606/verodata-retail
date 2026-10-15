import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { useApiData } from '../../lib/useApiData';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { EstadoError } from './Estados';
import { EncabezadoSeccion, SeccionPortada } from './SeccionPortada';
import type { CatalogoPaginado, CategoriaPublicaNodo } from '../../types/storefront.types';

interface VitrinaDepartamentosProps {
  categorias: CategoriaPublicaNodo[];
}

const MAX_DEPARTAMENTOS = 4;
const PRODUCTOS_POR_DEPARTAMENTO = 8;

/** Vitrina por departamento con pestañas (HU013). */
export function VitrinaDepartamentos({
  categorias,
}: VitrinaDepartamentosProps): React.ReactElement | null {
  const departamentos = categorias.slice(0, MAX_DEPARTAMENTOS);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const activaId = seleccion ?? departamentos[0]?.id ?? null;

  const resultado = useApiData<CatalogoPaginado>(
    activaId !== null
      ? `/api/v1/storefront/products?categoria_id=${activaId}&limite=${PRODUCTOS_POR_DEPARTAMENTO}`
      : null
  );

  if (departamentos.length === 0) return null;

  const activo = departamentos.find((d) => d.id === activaId);
  const items =
    resultado.estado.status === 'success'
      ? resultado.estado.data.items.slice(0, PRODUCTOS_POR_DEPARTAMENTO)
      : [];

  return (
    <SeccionPortada etiqueta="Compra por departamento" className="border-b border-store-line">
      <EncabezadoSeccion
        titulo="Compra por departamento"
        descripcion="Explora lo más vendido de cada categoría."
      />

      <div
        className="mt-lg flex gap-xxl overflow-x-auto border-b border-store-line"
        role="tablist"
        aria-label="Departamentos"
      >
        {departamentos.map((dep) => (
          <button
            key={dep.id}
            type="button"
            role="tab"
            aria-selected={activaId === dep.id}
            onClick={() => setSeleccion(dep.id)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-sm py-md text-base transition-colors',
              activaId === dep.id
                ? 'border-store-accent font-semibold text-store-accent'
                : 'border-transparent font-medium text-store-ink-soft hover:text-store-ink'
            )}
          >
            {dep.nombre}
          </button>
        ))}
      </div>

      <div className="mt-xl">
        {resultado.estado.status === 'loading' && (
          <div className="grid grid-cols-2 gap-xl md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <div className="grid grid-cols-2 gap-xl md:grid-cols-3 lg:grid-cols-4">
            {items.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </div>
    </SeccionPortada>
  );
}

export default VitrinaDepartamentos;
