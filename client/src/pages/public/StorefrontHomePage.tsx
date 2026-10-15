import React from 'react';
import { Link } from 'react-router-dom';
import { useApiData } from '../../lib/useApiData';
import { FRANJA_DEFECTO, leerFranja } from '../../lib/portada';
import { ProductCard, ProductCardSkeleton } from '../../components/storefront/ProductCard';
import { VitrinaDepartamentos } from '../../components/storefront/VitrinaDepartamentos';
import { BarraDepartamentos } from '../../components/storefront/BarraDepartamentos';
import { HeroTemporada } from '../../components/storefront/HeroTemporada';
import { BandaEditorial } from '../../components/storefront/BandaEditorial';
import { ConfianzaTienda } from '../../components/storefront/ConfianzaTienda';
import { EncabezadoSeccion, SeccionPortada } from '../../components/storefront/SeccionPortada';
import { EstadoError } from '../../components/storefront/Estados';
import type { BannerPublico, HomeData, ProductoPublico } from '../../types/storefront.types';

const PRODUCTOS_POR_VITRINA = 4;

/** Portada pública (HU013/HU034). Cada sección es full-bleed con contenido de 1312px. */
export function StorefrontHomePage(): React.ReactElement {
  const home = useApiData<HomeData>('/api/v1/storefront/home');

  if (home.estado.status === 'loading') {
    return <InicioSkeleton />;
  }

  if (home.estado.status === 'error') {
    return (
      <div className="mx-auto w-full max-w-[1312px] px-lg py-12">
        <EstadoError mensaje={home.estado.message} onReintentar={home.recargar} />
      </div>
    );
  }

  const data = home.estado.data;
  const franjaConfig = leerFranja(data.config.franja_confianza);

  return (
    <div className="flex flex-col">
      {data.banners.ticker.length > 0 && <Ticker banner={data.banners.ticker[0]} />}

      <HeroTemporada banners={data.banners.hero} />

      <BarraDepartamentos categorias={data.categorias} />

      {data.destacados.length > 0 && (
        <Vitrina
          etiqueta="Destacados"
          titulo="Destacados"
          descripcion="La selección que preparó nuestro equipo para ti."
          productos={data.destacados}
        />
      )}

      {data.ofertas.length > 0 && (
        <Vitrina
          etiqueta="Ofertas de la semana"
          sobretitulo="Ofertas"
          titulo="Ofertas de la semana"
          descripcion="Descuentos vigentes por tiempo limitado."
          acento="oferta"
          productos={data.ofertas}
        />
      )}

      <VitrinaDepartamentos categorias={data.categorias} />

      {data.banners.banda.length > 0 && <BandaEditorial banner={data.banners.banda[0]} />}

      {data.nuevos.length > 0 && (
        <Vitrina
          etiqueta="Nuevos ingresos"
          titulo="Nuevos ingresos"
          descripcion="Lo último que llegó a la tienda."
          productos={data.nuevos}
        />
      )}

      <ConfianzaTienda items={franjaConfig.length > 0 ? franjaConfig : FRANJA_DEFECTO} />
    </div>
  );
}

// ─── Secciones ────────────────────────────────────────────────────────────────

function Ticker({ banner }: { banner: BannerPublico }): React.ReactElement {
  return (
    <section aria-label="Promoción" className="w-full bg-store-ink text-white">
      <div className="mx-auto flex w-full max-w-[1312px] flex-wrap items-center justify-between gap-sm px-lg py-sm">
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

interface VitrinaProps {
  etiqueta: string;
  sobretitulo?: string;
  titulo: string;
  descripcion?: string;
  acento?: 'oferta' | 'neutro';
  productos: ProductoPublico[];
}

function Vitrina({
  etiqueta,
  sobretitulo,
  titulo,
  descripcion,
  acento = 'neutro',
  productos,
}: VitrinaProps): React.ReactElement {
  return (
    <SeccionPortada etiqueta={etiqueta} className="border-b border-store-line">
      <EncabezadoSeccion
        sobretitulo={sobretitulo}
        titulo={titulo}
        descripcion={descripcion}
        acento={acento}
      />
      <div className="mt-xl grid grid-cols-2 gap-xl md:grid-cols-3 lg:grid-cols-4">
        {productos.slice(0, PRODUCTOS_POR_VITRINA).map((producto) => (
          <ProductCard key={producto.id} producto={producto} />
        ))}
      </div>
    </SeccionPortada>
  );
}

/** Skeleton con la silueta exacta de la portada. */
function InicioSkeleton(): React.ReactElement {
  return (
    <div className="flex animate-pulse flex-col" aria-hidden="true">
      <div className="flex flex-col lg:h-[480px] lg:flex-row">
        <div className="h-64 bg-store-ink/80 sm:h-80 lg:h-full lg:w-[560px]" />
        <div className="h-64 flex-1 bg-store-line/60 sm:h-80 lg:h-full" />
      </div>

      <div className="border-b border-store-line px-lg py-8">
        <div className="mx-auto flex w-full max-w-[1312px] gap-md">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 flex-1 rounded-full bg-store-line/60" />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1312px] px-lg py-12">
        <div className="h-3 w-24 rounded-full bg-store-line/60" />
        <div className="mt-md h-7 w-64 rounded-full bg-store-line/60" />
        <div className="mt-xl grid grid-cols-2 gap-xl md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default StorefrontHomePage;
