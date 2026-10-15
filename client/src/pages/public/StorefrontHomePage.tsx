import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, CreditCard, RefreshCcw, Truck, Wallet, type LucideIcon } from 'lucide-react';
import { cn, CONTENEDOR_TIENDA } from '../../lib/utils';
import { useApiData } from '../../lib/useApiData';
import { aplanarCategorias } from '../../lib/storefront';
import { ProductCard } from '../../components/storefront/ProductCard';
import { VitrinaDepartamentos } from '../../components/storefront/VitrinaDepartamentos';
import { EstadoError, GrillaSkeleton } from '../../components/storefront/Estados';
import type { BannerPublico, HomeData, ProductoPublico } from '../../types/storefront.types';
import type { FranjaConfianza } from '../../types/banner.types';

const CONTENEDOR = CONTENEDOR_TIENDA;

const FRANJA_DEFECTO: FranjaConfianza[] = [
  { titulo: 'Envíos a todo el Perú', texto: 'Despacho en 24–48 horas.' },
  { titulo: 'Cambios sin costo', texto: 'Hasta 30 días después de tu compra.' },
  { titulo: 'Yape y Plin', texto: 'Pagos móviles al instante.' },
  { titulo: 'Compra en cuotas', texto: 'Con tarjetas participantes.' },
];

const ICONOS_CONFIANZA: LucideIcon[] = [Truck, RefreshCcw, Wallet, CreditCard];

function esFranja(valor: unknown): valor is FranjaConfianza {
  return typeof valor === 'object' && valor !== null && 'titulo' in valor && 'texto' in valor;
}

function leerFranja(config: Record<string, unknown>): FranjaConfianza[] {
  const valor = config.franja_confianza;
  if (Array.isArray(valor)) {
    const items = valor.filter(esFranja).map((v) => ({ titulo: String(v.titulo), texto: String(v.texto) }));
    if (items.length > 0) return items;
  }
  return FRANJA_DEFECTO;
}

export function StorefrontHomePage(): React.ReactElement {
  const home = useApiData<HomeData>('/api/v1/storefront/home');
  const data = home.estado.status === 'success' ? home.estado.data : null;

  return (
    <div className={`${CONTENEDOR} flex flex-col gap-huge py-xl`}>
      {home.estado.status === 'loading' && <InicioSkeleton />}

      {home.estado.status === 'error' && (
        <EstadoError mensaje={home.estado.message} onReintentar={home.recargar} />
      )}

      {data && (
        <>
          {data.banners.ticker.length > 0 && <Ticker banner={data.banners.ticker[0]} />}

          <Hero banners={data.banners.hero} />

          {data.categorias.length > 0 && (
            <section className="flex flex-wrap gap-sm">
              {aplanarCategorias(data.categorias)
                .filter((c) => c.nivel === 0)
                .slice(0, 8)
                .map((chip) => (
                  <Link
                    key={chip.id}
                    to={`/catalogo?categoria_id=${chip.id}`}
                    className="rounded-full border border-store-line bg-store-surface px-lg py-sm text-sm font-medium text-store-ink-soft transition-colors hover:border-store-ink hover:text-store-ink"
                  >
                    {chip.nombre}
                  </Link>
                ))}
            </section>
          )}

          {data.destacados.length > 0 && <Vitrina titulo="Destacados" productos={data.destacados} />}
          {data.ofertas.length > 0 && <Vitrina titulo="Ofertas de la semana" productos={data.ofertas} />}
          {data.categorias.length > 0 && <VitrinaDepartamentos categorias={data.categorias} />}
          <Vitrina titulo="Nuevos ingresos" productos={data.nuevos} />

          {data.banners.banda.length > 0 && <BandaEditorial banner={data.banners.banda[0]} />}

          <FranjaConfianza items={leerFranja(data.config)} />
        </>
      )}
    </div>
  );
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function Ticker({ banner }: { banner: BannerPublico }): React.ReactElement {
  return (
    <section className="overflow-hidden rounded-sm bg-store-ink text-white">
      <div className={`${CONTENEDOR} flex flex-wrap items-center justify-between gap-sm py-sm`}>
        <p className="text-sm">
          <span className="font-semibold">{banner.titulo}</span>
          {banner.subtitulo ? <span className="text-white/80"> · {banner.subtitulo}</span> : null}
        </p>
        {banner.cta_texto && (
          <Link
            to={banner.cta_url || '/catalogo'}
            className="rounded-md bg-white px-md py-xs text-xs font-semibold text-store-ink transition-colors hover:bg-white/90"
          >
            {banner.cta_texto}
          </Link>
        )}
      </div>
    </section>
  );
}

function Hero({ banners }: { banners: BannerPublico[] }): React.ReactElement {
  const [indice, setIndice] = useState(0);

  if (banners.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg bg-store-ink px-xl py-huge text-white">
        <div className="flex max-w-[560px] flex-col gap-md">
          <span className="text-sm font-medium uppercase tracking-widest text-white/70">Nueva temporada</span>
          <h1 className="text-display-lg font-semibold">Equípate para el día a día</h1>
          <p className="text-base text-white/80">Calzado, indumentaria y accesorios seleccionados. Envíos a todo el Perú.</p>
          <div>
            <Link to="/catalogo" className="inline-flex items-center gap-sm rounded-md bg-white px-lg py-md text-sm font-semibold text-store-ink transition-colors hover:bg-white/90">
              Ver todo <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const total = banners.length;
  const actual = Math.min(indice, total - 1);
  const banner = banners[actual];
  const ir = (n: number): void => setIndice((n + total) % total);

  return (
    <section className="relative overflow-hidden rounded-lg" aria-roledescription="carrusel">
      <img src={banner.imagen_url} alt="" className="h-[320px] w-full object-cover md:h-[400px]" />
      <div className="absolute inset-0 flex flex-col justify-center gap-md bg-ink/50 p-xl text-white">
        <h1 className="max-w-[560px] text-display-lg font-semibold">{banner.titulo}</h1>
        {banner.subtitulo && <p className="max-w-[520px] text-base text-white/85">{banner.subtitulo}</p>}
        {banner.cta_texto && (
          <div>
            <Link to={banner.cta_url || '/catalogo'} className="inline-flex items-center gap-sm rounded-md bg-white px-lg py-md text-sm font-semibold text-store-ink transition-colors hover:bg-white/90">
              {banner.cta_texto} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => ir(actual - 1)}
            aria-label="Banner anterior"
            className="absolute left-md top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-store-ink transition-colors hover:bg-white"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => ir(actual + 1)}
            aria-label="Banner siguiente"
            className="absolute right-md top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-store-ink transition-colors hover:bg-white"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <div className="absolute bottom-md left-1/2 flex -translate-x-1/2 gap-sm">
            {banners.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ir al banner ${i + 1}`}
                aria-current={i === actual}
                className={cn('h-2 rounded-full transition-all', i === actual ? 'w-6 bg-white' : 'w-2 bg-white/60')}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function BandaEditorial({ banner }: { banner: BannerPublico }): React.ReactElement {
  return (
    <section className="grid items-stretch overflow-hidden rounded-lg border border-store-line bg-store-surface md:grid-cols-2">
      <img src={banner.imagen_url} alt="" className="h-56 w-full object-cover md:h-full" />
      <div className="flex flex-col justify-center gap-md p-xl">
        <h2 className="text-display-md font-semibold text-store-ink">{banner.titulo}</h2>
        {banner.subtitulo && <p className="text-base text-store-ink-soft">{banner.subtitulo}</p>}
        {banner.cta_texto && (
          <div>
            <Link to={banner.cta_url || '/catalogo'} className="inline-flex items-center gap-sm rounded-md bg-store-ink px-lg py-md text-sm font-semibold text-white transition-colors hover:bg-store-ink/90">
              {banner.cta_texto} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function FranjaConfianza({ items }: { items: FranjaConfianza[] }): React.ReactElement {
  return (
    <section className="grid gap-lg rounded-lg border border-store-line bg-store-surface p-xl md:grid-cols-4">
      {items.map((item, index) => {
        const Icono = ICONOS_CONFIANZA[index % ICONOS_CONFIANZA.length];
        return (
          <div key={`${item.titulo}-${index}`} className="flex flex-col gap-xs">
            <span className="text-store-ink" aria-hidden="true"><Icono size={20} /></span>
            <span className="text-sm font-semibold text-store-ink">{item.titulo}</span>
            <span className="text-sm text-store-ink-soft">{item.texto}</span>
          </div>
        );
      })}
    </section>
  );
}

function Vitrina({ titulo, productos }: { titulo: string; productos: ProductoPublico[] }): React.ReactElement | null {
  if (productos.length === 0) return null;
  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-end justify-between gap-md">
        <h2 className="text-heading-lg font-semibold text-store-ink">{titulo}</h2>
        <Link to="/catalogo" className="flex items-center gap-xs text-sm font-medium text-store-accent hover:underline">
          Ver más <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-md md:grid-cols-3 lg:grid-cols-5">
        {productos.slice(0, 5).map((producto) => (
          <ProductCard key={producto.id} producto={producto} />
        ))}
      </div>
    </section>
  );
}

function InicioSkeleton(): React.ReactElement {
  return (
    <div className="flex animate-pulse flex-col gap-huge">
      <div className="h-[320px] rounded-lg bg-store-line/60 md:h-[400px]" />
      <div className="flex gap-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-full bg-store-line/60" />
        ))}
      </div>
      <GrillaSkeleton cantidad={5} />
    </div>
  );
}
