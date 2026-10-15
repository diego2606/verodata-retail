import React from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { formatearPrecio } from '../../lib/storefront';
import { useColores } from '../../context/ColoresContext';
import type { ProductoPublico } from '../../types/storefront.types';

interface ProductCardProps {
  producto: ProductoPublico;
}

/** Tarjeta de producto del Storefront (HU013 CA02/CA03). */
export function ProductCard({ producto }: ProductCardProps): React.ReactElement {
  const enOferta = producto.descuento_pct > 0 && producto.precio_oferta !== null;
  const { hexDeColor } = useColores();
  const colorNombre = producto.atributos.COLOR;
  const colorHex = hexDeColor(colorNombre);

  return (
    <Link
      to={`/producto/${producto.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-store-line bg-store-surface transition-colors hover:border-store-ink-mute focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-store-accent"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-store-canvas">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            loading="lazy"
            className="h-full w-full object-contain p-md transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-store-ink-mute">
            <ImageOff size={28} aria-hidden="true" />
          </div>
        )}

        {enOferta && (
          <span className="absolute left-sm top-sm rounded-full bg-store-offer px-sm py-xxs text-xs font-semibold text-white">
            -{producto.descuento_pct}%
          </span>
        )}

        {!producto.disponible && (
          <span className="absolute inset-0 flex items-center justify-center bg-store-surface/75 text-xs font-semibold uppercase tracking-wide text-store-ink">
            Agotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-xxs p-md">
        <span className="truncate text-xs uppercase tracking-wide text-store-ink-mute">
          {producto.categoria_nombre}
        </span>
        <h3 className="line-clamp-2 text-sm font-medium text-store-ink">{producto.nombre}</h3>

        {colorNombre && colorHex && (
          <span className="flex items-center gap-xs text-xs text-store-ink-mute">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-store-line"
              style={{ backgroundColor: colorHex }}
              aria-hidden="true"
            />
            {colorNombre}
          </span>
        )}

        <div className="mt-auto flex items-baseline gap-sm pt-sm">
          {enOferta && producto.precio_oferta !== null ? (
            <>
              <span className="font-mono text-lg font-semibold text-store-offer">
                {formatearPrecio(producto.precio_oferta)}
              </span>
              <span className="font-mono text-sm text-store-ink-mute line-through">
                {formatearPrecio(producto.precio_regular)}
              </span>
            </>
          ) : (
            <span className="font-mono text-lg font-semibold text-store-ink">
              {formatearPrecio(producto.precio_regular)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Skeleton que calca la forma exacta de la tarjeta. */
export function ProductCardSkeleton(): React.ReactElement {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-lg border border-store-line bg-store-surface">
      <div className="aspect-square w-full bg-store-line/60" />
      <div className="flex flex-col gap-sm p-md">
        <div className="h-2.5 w-1/3 rounded-full bg-store-line" />
        <div className="h-3 w-4/5 rounded-full bg-store-line" />
        <div className="h-4 w-1/2 rounded-full bg-store-line" />
      </div>
    </div>
  );
}
