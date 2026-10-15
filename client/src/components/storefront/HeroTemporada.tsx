import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { BannerPublico } from '../../types/storefront.types';

interface HeroTemporadaProps {
  banners: BannerPublico[];
}

/** Contenido de respaldo cuando aún no hay banners HERO cargados. */
const RESPALDO = {
  etiqueta: 'Nueva temporada',
  titulo: 'Equípate para el día a día',
  promesa: 'Calzado, indumentaria y accesorios seleccionados. Envíos a todo el Perú.',
};

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/**
 * Hero editorial partido: panel oscuro de campaña (560px) + fotografía (880px)
 * con controles de carrusel superpuestos. Cada banner HERO activo es un slide.
 */
export function HeroTemporada({ banners }: HeroTemporadaProps): React.ReactElement {
  const [indice, setIndice] = useState(0);

  const total = banners.length;
  const actual = total > 0 ? Math.min(indice, total - 1) : 0;
  const banner = banners[actual];
  const ir = (n: number): void => setIndice((n + total) % total);

  const panel = (
    <div className="flex flex-col items-start justify-center gap-5 bg-store-ink p-xl md:p-16 lg:w-[560px] lg:shrink-0">
      <span className="text-xs font-semibold text-store-ink-mute">
        {banner?.etiqueta ?? RESPALDO.etiqueta}
      </span>
      <h1 className="text-display-xl font-bold leading-[1.03] text-white">
        {banner?.titulo ?? RESPALDO.titulo}
      </h1>
      <p className="text-[15px] leading-relaxed text-white/90">
        {banner?.subtitulo ?? RESPALDO.promesa}
      </p>
      <Link
        to={banner?.cta_url || '/catalogo'}
        className="mt-2 inline-flex h-12 items-center gap-sm rounded-md bg-white px-xl text-[15px] font-semibold text-store-ink transition-colors hover:bg-white/90"
      >
        {banner?.cta_texto || 'Ver todo'}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Campaña de temporada"
      className="flex w-full flex-col lg:h-[480px] lg:flex-row"
    >
      {/* Panel de campaña */}
      <div className="order-2 flex lg:order-1">{panel}</div>

      {/* Imagen + controles */}
      <div className="relative order-1 h-64 w-full overflow-hidden bg-store-canvas sm:h-80 lg:order-2 lg:h-full lg:flex-1">
        {banner ? (
          <img src={banner.imagen_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-store-ink" aria-hidden="true" />
        )}

        {total > 1 && (
          <div className="absolute bottom-7 left-8 right-8 flex items-center justify-between gap-md">
            <div className="flex items-center gap-xs">
              {banners.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndice(i)}
                  aria-label={`Ir al slide ${i + 1}`}
                  aria-current={i === actual}
                  className={cn(
                    'h-1 rounded-full transition-all',
                    i === actual ? 'w-8 bg-store-ink' : 'w-2.5 bg-white'
                  )}
                />
              ))}
              <span className="ml-sm font-mono text-[11px] font-semibold text-store-ink">
                {dosDigitos(actual + 1)}/{dosDigitos(total)}
              </span>
            </div>

            <div className="flex items-center gap-sm">
              <button
                type="button"
                onClick={() => ir(actual - 1)}
                aria-label="Slide anterior"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-store-ink transition-colors hover:bg-white/85"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => ir(actual + 1)}
                aria-label="Slide siguiente"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-store-ink transition-colors hover:bg-white/85"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroTemporada;
