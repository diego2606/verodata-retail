import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { BannerPublico } from '../../types/storefront.types';

interface BandaEditorialProps {
  banner: BannerPublico;
}

/** Bloque editorial a sangre: fotografía (760px) + historia de campaña (680px). */
export function BandaEditorial({ banner }: BandaEditorialProps): React.ReactElement {
  return (
    <section aria-label="Editorial" className="flex w-full flex-col bg-store-surface lg:h-[460px] lg:flex-row">
      <img
        src={banner.imagen_url}
        alt=""
        className="h-64 w-full object-cover sm:h-80 lg:h-full lg:w-[760px] lg:shrink-0"
      />

      <div className="flex flex-col justify-center gap-5 p-xl md:p-14 lg:w-[680px] lg:flex-1">
        {banner.etiqueta && (
          <span className="text-xs font-semibold text-store-ink-soft">{banner.etiqueta}</span>
        )}
        <h2 className="text-[44px] font-bold leading-[1.08] text-store-ink">{banner.titulo}</h2>
        {banner.subtitulo && (
          <p className="text-[15px] leading-relaxed text-store-ink-soft">{banner.subtitulo}</p>
        )}
        {banner.cta_texto && (
          <div>
            <Link
              to={banner.cta_url || '/catalogo'}
              className="inline-flex h-12 items-center gap-sm rounded-md bg-store-ink px-xl text-[15px] font-semibold text-white transition-colors hover:bg-store-ink/90"
            >
              {banner.cta_texto}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default BandaEditorial;
