import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, RefreshCcw, Truck, Wallet } from 'lucide-react';
import { useApiData } from '../../lib/useApiData';
import { aplanarCategorias, soloOfertas } from '../../lib/storefront';
import { ProductCard } from '../../components/storefront/ProductCard';
import { EstadoError, GrillaSkeleton } from '../../components/storefront/Estados';
import type { CatalogoPaginado, CategoriaPublicaNodo, ProductoPublico } from '../../types/storefront.types';

const CONTENEDOR = 'mx-auto w-full max-w-[1200px] px-lg';

export function StorefrontHomePage(): React.ReactElement {
  const categorias = useApiData<CategoriaPublicaNodo[]>('/api/v1/storefront/categories');
  const productos = useApiData<CatalogoPaginado>('/api/v1/storefront/products?limite=16');

  const ofertas = productos.estado.status === 'success'
    ? soloOfertas(productos.estado.data.items).slice(0, 5)
    : [];
  const nuevos = productos.estado.status === 'success'
    ? productos.estado.data.items.slice(0, 5)
    : [];
  const chips = categorias.estado.status === 'success'
    ? aplanarCategorias(categorias.estado.data).filter((c) => c.nivel === 0).slice(0, 8)
    : [];

  return (
    <div className={`${CONTENEDOR} flex flex-col gap-huge py-xl`}>
      {/* Hero editorial estático (sin video) */}
      <section className="overflow-hidden rounded-lg bg-store-ink px-xl py-huge text-white">
        <div className="flex max-w-[560px] flex-col gap-md">
          <span className="text-sm font-medium uppercase tracking-widest text-white/70">Nueva temporada</span>
          <h1 className="text-display-lg font-semibold">Equípate para el día a día</h1>
          <p className="text-base text-white/80">
            Calzado, indumentaria y accesorios seleccionados. Envíos a todo el Perú.
          </p>
          <div>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-sm rounded-xs bg-white px-lg py-md text-sm font-semibold text-store-ink transition-colors hover:bg-white/90"
            >
              Ver todo
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Accesos por departamento */}
      {chips.length > 0 && (
        <section className="flex flex-col gap-md">
          <div className="flex flex-wrap gap-sm">
            {chips.map((chip) => (
              <Link
                key={chip.id}
                to={`/catalogo?categoria_id=${chip.id}`}
                className="rounded-full border border-store-line bg-store-surface px-lg py-sm text-sm font-medium text-store-ink-soft transition-colors hover:border-store-ink hover:text-store-ink"
              >
                {chip.nombre}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Contenido de producto: estados loading / error / éxito */}
      {productos.estado.status === 'loading' && (
        <section className="flex flex-col gap-md">
          <div className="h-6 w-40 animate-pulse rounded-full bg-store-line" />
          <GrillaSkeleton cantidad={5} />
        </section>
      )}

      {productos.estado.status === 'error' && (
        <EstadoError mensaje={productos.estado.message} onReintentar={productos.recargar} />
      )}

      {productos.estado.status === 'success' && (
        <>
          {ofertas.length > 0 && (
            <Vitrina titulo="Ofertas de la semana" productos={ofertas} />
          )}
          <Vitrina titulo="Nuevos ingresos" productos={nuevos} />
        </>
      )}

      {/* Franja de confianza */}
      <section className="grid gap-lg rounded-lg border border-store-line bg-store-surface p-xl md:grid-cols-4">
        <Confianza icono={<Truck size={20} />} titulo="Envíos a todo el Perú" texto="Despacho en 24–48 horas." />
        <Confianza icono={<RefreshCcw size={20} />} titulo="Cambios sin costo" texto="Hasta 30 días después de tu compra." />
        <Confianza icono={<Wallet size={20} />} titulo="Yape y Plin" texto="Pagos móviles al instante." />
        <Confianza icono={<CreditCard size={20} />} titulo="Compra en cuotas" texto="Con tarjetas participantes." />
      </section>
    </div>
  );
}

interface VitrinaProps {
  titulo: string;
  productos: ProductoPublico[];
}

function Vitrina({ titulo, productos }: VitrinaProps): React.ReactElement | null {
  if (productos.length === 0) return null;
  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-end justify-between gap-md">
        <h2 className="text-heading-lg font-semibold text-store-ink">{titulo}</h2>
        <Link
          to="/catalogo"
          className="flex items-center gap-xs text-sm font-medium text-store-accent hover:underline"
        >
          Ver más
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-5">
        {productos.map((producto) => (
          <ProductCard key={producto.id} producto={producto} />
        ))}
      </div>
    </section>
  );
}

interface ConfianzaProps {
  icono: React.ReactNode;
  titulo: string;
  texto: string;
}

function Confianza({ icono, titulo, texto }: ConfianzaProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-xs">
      <span className="text-store-ink" aria-hidden="true">{icono}</span>
      <span className="text-sm font-semibold text-store-ink">{titulo}</span>
      <span className="text-sm text-store-ink-soft">{texto}</span>
    </div>
  );
}
