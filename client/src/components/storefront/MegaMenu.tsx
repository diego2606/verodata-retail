import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApiData } from '../../lib/useApiData';
import type { CategoriaPublicaNodo } from '../../types/storefront.types';

interface MegaMenuProps {
  onClose: () => void;
}

/**
 * Mega menú de categorías (estilo marketplace): columna izquierda con las
 * categorías de primer nivel y panel derecho con sus subcategorías en columnas.
 */
export function MegaMenu({ onClose }: MegaMenuProps): React.ReactElement {
  const categorias = useApiData<CategoriaPublicaNodo[]>('/api/v1/storefront/categories');
  const [activaId, setActivaId] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tops = categorias.estado.status === 'success' ? categorias.estado.data : [];
  const activo = tops.find((t) => t.id === (activaId ?? tops[0]?.id)) ?? null;

  return (
    <div className="absolute inset-x-0 top-full z-10 border-b border-store-line bg-store-surface">
      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-lg px-lg py-lg md:grid-cols-[260px_1fr]">
        {/* Categorías de primer nivel */}
        <nav aria-label="Categorías" className="flex flex-col">
          {categorias.estado.status === 'loading' && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-store-line/50" />
              ))}
            </div>
          )}

          {categorias.estado.status === 'error' && (
            <p className="px-md py-sm text-sm text-store-ink-soft">No se pudieron cargar las categorías.</p>
          )}

          {tops.map((top) => {
            const activa = activo?.id === top.id;
            return (
              <button
                key={top.id}
                type="button"
                aria-current={activa}
                onMouseEnter={() => setActivaId(top.id)}
                onFocus={() => setActivaId(top.id)}
                onClick={() => setActivaId(top.id)}
                className={cn(
                  'flex items-center justify-between gap-sm border-l-2 px-md py-sm text-left text-sm transition-colors',
                  activa
                    ? 'border-store-ink bg-store-canvas font-semibold text-store-ink'
                    : 'border-transparent text-store-ink-soft hover:bg-store-canvas hover:text-store-ink'
                )}
              >
                {top.nombre}
                <ChevronRight size={14} className="shrink-0 text-store-ink-mute" aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        {/* Subcategorías */}
        <div className="min-w-0">
          {activo && (
            <>
              <div className="mb-md flex items-center justify-between gap-md border-b border-store-line pb-sm">
                <span className="text-lg font-semibold text-store-ink">{activo.nombre}</span>
                <Link
                  to={`/catalogo?categoria_id=${activo.id}`}
                  onClick={onClose}
                  className="text-sm font-medium text-store-accent hover:underline"
                >
                  Ver todo
                </Link>
              </div>

              {activo.hijos.length === 0 ? (
                <p className="text-sm text-store-ink-soft">Explora esta categoría en el catálogo.</p>
              ) : (
                <div className="columns-1 gap-lg sm:columns-2 lg:columns-3">
                  {activo.hijos.map((hijo) => (
                    <div key={hijo.id} className="mb-lg break-inside-avoid">
                      <Link
                        to={`/catalogo?categoria_id=${hijo.id}`}
                        onClick={onClose}
                        className="text-sm font-semibold text-store-ink hover:text-store-accent"
                      >
                        {hijo.nombre}
                      </Link>
                      {hijo.hijos.length > 0 && (
                        <ul className="mt-xs flex flex-col gap-xxs">
                          {hijo.hijos.map((nieto) => (
                            <li key={nieto.id}>
                              <Link
                                to={`/catalogo?categoria_id=${nieto.id}`}
                                onClick={onClose}
                                className="text-sm text-store-ink-soft hover:text-store-accent"
                              >
                                {nieto.nombre}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MegaMenu;
