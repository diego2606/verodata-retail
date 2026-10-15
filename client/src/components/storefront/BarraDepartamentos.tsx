import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { iconoDepartamento } from '../../lib/portada';
import type { CategoriaPublicaNodo } from '../../types/storefront.types';

interface BarraDepartamentosProps {
  categorias: CategoriaPublicaNodo[];
}

const MAX_DEPARTAMENTOS = 6;

/** Barra de accesos rápidos por departamento, debajo del hero. */
export function BarraDepartamentos({ categorias }: BarraDepartamentosProps): React.ReactElement | null {
  const departamentos = categorias.slice(0, MAX_DEPARTAMENTOS);
  if (departamentos.length === 0) return null;

  return (
    <section
      aria-label="Accesos por departamento"
      className="w-full border-b border-store-line bg-store-surface"
    >
      <div className="mx-auto flex w-full max-w-[1312px] flex-wrap gap-md px-lg py-8">
        {departamentos.map((departamento) => {
          const Icono = iconoDepartamento(departamento.nombre);
          return (
            <Link
              key={departamento.id}
              to={`/catalogo?categoria_id=${departamento.id}`}
              className="flex h-11 min-w-[140px] flex-1 items-center justify-center gap-sm rounded-full border border-store-line bg-store-surface px-lg text-sm font-medium text-store-ink transition-colors hover:border-store-ink hover:bg-store-canvas"
            >
              <Icono size={18} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{departamento.nombre}</span>
            </Link>
          );
        })}

        <Link
          to="/catalogo"
          className="flex h-11 min-w-[140px] flex-1 items-center justify-center gap-sm rounded-full border border-store-line bg-store-surface px-lg text-sm font-medium text-store-accent transition-colors hover:border-store-accent hover:bg-store-canvas"
        >
          Ver todo
          <ArrowRight size={18} aria-hidden="true" className="shrink-0" />
        </Link>
      </div>
    </section>
  );
}
