import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApiData } from '../../lib/useApiData';
import { aplanarCategorias, construirQueryCatalogo } from '../../lib/storefront';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { ProductCard } from '../../components/storefront/ProductCard';
import { EstadoError, EstadoVacio, GrillaSkeleton } from '../../components/storefront/Estados';
import type { CatalogoPaginado, CategoriaPublicaNodo, FiltrosCatalogo } from '../../types/storefront.types';

const CONTENEDOR = 'mx-auto w-full max-w-[1200px] px-lg';

export function CatalogPage(): React.ReactElement {
  const [params, setParams] = useSearchParams();

  const categoriaParam = params.get('categoria_id');
  const categoriaId = categoriaParam ? Number(categoriaParam) : undefined;
  const searchParam = params.get('search') ?? '';

  const [texto, setTexto] = useState(searchParam);
  const [min, setMin] = useState(params.get('precio_min') ?? '');
  const [max, setMax] = useState(params.get('precio_max') ?? '');

  // Sincroniza el formulario cuando cambian los parámetros de la URL (p. ej. chips).
  useEffect(() => {
    setTexto(params.get('search') ?? '');
    setMin(params.get('precio_min') ?? '');
    setMax(params.get('precio_max') ?? '');
  }, [params]);

  const categorias = useApiData<CategoriaPublicaNodo[]>('/api/v1/storefront/categories');
  const opciones = categorias.estado.status === 'success' ? aplanarCategorias(categorias.estado.data) : [];

  const filtros: FiltrosCatalogo = {
    search: searchParam || undefined,
    categoria_id: categoriaId,
    precio_min: params.get('precio_min') ? Number(params.get('precio_min')) : undefined,
    precio_max: params.get('precio_max') ? Number(params.get('precio_max')) : undefined,
    pagina: Number(params.get('pagina') ?? '1'),
    limite: 24,
  };
  const productos = useApiData<CatalogoPaginado>(
    `/api/v1/storefront/products${construirQueryCatalogo(filtros)}`
  );
  const resultado = productos.estado.status === 'success' ? productos.estado.data : null;

  const hayFiltros = Boolean(searchParam || categoriaId || min || max);

  function aplicar(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = new URLSearchParams();
    if (texto.trim()) next.set('search', texto.trim());
    if (categoriaId) next.set('categoria_id', String(categoriaId));
    if (min) next.set('precio_min', min);
    if (max) next.set('precio_max', max);
    setParams(next);
  }

  function seleccionarCategoria(id?: number): void {
    const next = new URLSearchParams(params);
    if (id) next.set('categoria_id', String(id));
    else next.delete('categoria_id');
    next.delete('pagina');
    setParams(next);
  }

  function limpiar(): void {
    setParams(new URLSearchParams());
  }

  function irPagina(pagina: number): void {
    const next = new URLSearchParams(params);
    next.set('pagina', String(pagina));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className={`${CONTENEDOR} flex flex-col gap-lg py-xl`}>
      <div className="flex flex-col gap-xs">
        <h1 className="text-display-md font-semibold text-store-ink">Catálogo</h1>
        {resultado && (
          <p className="text-sm text-store-ink-soft">
            {resultado.total} producto{resultado.total === 1 ? '' : 's'}
            {searchParam ? ` para “${searchParam}”` : ''}
          </p>
        )}
      </div>

      {/* Chips de categoría */}
      {opciones.length > 0 && (
        <div className="flex flex-wrap gap-sm">
          <ChipCategoria activo={!categoriaId} onClick={() => seleccionarCategoria(undefined)}>
            Todas
          </ChipCategoria>
          {opciones.slice(0, 12).map((opcion) => (
            <ChipCategoria
              key={opcion.id}
              activo={categoriaId === opcion.id}
              onClick={() => seleccionarCategoria(opcion.id)}
            >
              {opcion.nivel > 0 ? `· ${opcion.nombre}` : opcion.nombre}
            </ChipCategoria>
          ))}
        </div>
      )}

      {/* Filtros */}
      <form onSubmit={aplicar} className="flex flex-wrap items-end gap-md rounded-lg border border-store-line bg-store-surface p-md">
        <div className="flex min-w-[220px] flex-1 flex-col gap-xs">
          <label htmlFor="filtro-busqueda" className="text-xs font-medium text-store-ink-soft">Buscar</label>
          <Input
            id="filtro-busqueda"
            type="search"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            placeholder="Nombre, marca o SKU"
            className="border-store-line text-store-ink focus:ring-store-accent"
          />
        </div>
        <div className="flex w-32 flex-col gap-xs">
          <label htmlFor="filtro-min" className="text-xs font-medium text-store-ink-soft">Precio mín.</label>
          <Input
            id="filtro-min"
            type="number"
            min={0}
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder="0"
            className="border-store-line font-mono text-store-ink focus:ring-store-accent"
          />
        </div>
        <div className="flex w-32 flex-col gap-xs">
          <label htmlFor="filtro-max" className="text-xs font-medium text-store-ink-soft">Precio máx.</label>
          <Input
            id="filtro-max"
            type="number"
            min={0}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder="9999"
            className="border-store-line font-mono text-store-ink focus:ring-store-accent"
          />
        </div>
        <Button type="submit" variant="primary" className="bg-store-ink text-white hover:bg-store-ink/90">
          Aplicar filtros
        </Button>
        {hayFiltros && (
          <Button type="button" variant="ghost" onClick={limpiar} className="text-store-ink-soft hover:bg-store-canvas">
            Limpiar
          </Button>
        )}
      </form>

      {/* Resultados */}
      {productos.estado.status === 'loading' && <GrillaSkeleton cantidad={8} />}

      {productos.estado.status === 'error' && (
        <EstadoError mensaje={productos.estado.message} onReintentar={productos.recargar} />
      )}

      {resultado && resultado.items.length === 0 && (
        <EstadoVacio
          titulo={hayFiltros ? 'Sin resultados' : 'Catálogo vacío'}
          descripcion={
            hayFiltros
              ? 'No encontramos productos con esos filtros. Prueba con otros criterios.'
              : 'Todavía no hay productos publicados. Vuelve pronto.'
          }
          labelAccion={hayFiltros ? 'Limpiar filtros' : undefined}
          onAccion={hayFiltros ? limpiar : undefined}
        />
      )}

      {resultado && resultado.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-4">
            {resultado.items.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>

          {resultado.total_paginas > 1 && (
            <div className="flex items-center justify-center gap-md pt-md">
              <Button
                variant="secondary"
                disabled={resultado.pagina <= 1}
                onClick={() => irPagina(resultado.pagina - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-store-ink-soft">
                Página {resultado.pagina} de {resultado.total_paginas}
              </span>
              <Button
                variant="secondary"
                disabled={resultado.pagina >= resultado.total_paginas}
                onClick={() => irPagina(resultado.pagina + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <span className="sr-only" aria-live="polite">
        {resultado
          ? `${resultado.total} resultados`
          : productos.estado.status === 'loading'
            ? 'Cargando resultados'
            : 'Error al cargar resultados'}
      </span>
    </div>
  );
}

interface ChipCategoriaProps {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ChipCategoria({ activo, onClick, children }: ChipCategoriaProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'rounded-full border px-lg py-sm text-sm font-medium transition-colors',
        activo
          ? 'border-store-ink bg-store-ink text-white'
          : 'border-store-line bg-store-surface text-store-ink-soft hover:border-store-ink hover:text-store-ink'
      )}
    >
      {children}
    </button>
  );
}
