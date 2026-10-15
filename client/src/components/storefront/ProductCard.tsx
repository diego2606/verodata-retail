import React from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { formatearPrecio } from '../../lib/storefront';
import { useColores } from '../../context/ColoresContext';
import { cn } from '../../lib/utils';
import type { ProductoPublico } from '../../types/storefront.types';

interface ProductCardProps {
  producto: ProductoPublico;
}

/**
 * Tarjeta de producto del Storefront (HU013 CA02/CA03).
 *
 * El pie lleva un CTA "Ver producto" en lugar de "Agregar a la bolsa" porque el
 * carrito aún no existe (HU020); cuando llegue, solo cambia la etiqueta y la
 * acción. La tarjeta entera es un único enlace al detalle.
 */
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
      <div className="relative aspect-square w-full overflow-hidden bg-store-surface">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            loading="lazy"
            className="h-full w-full object-contain p-sm transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-store-ink-mute">
            <ImageOff size={28} aria-hidden="true" />
          </div>
        )}

        {enOferta && (
          <span className="absolute left-lg top-lg rounded-full bg-store-offer px-md py-xxs font-mono text-xs font-bold text-white">
            -{producto.descuento_pct}%
          </span>
        )}

        {!producto.disponible && (
          <span className="absolute inset-0 flex items-center justify-center bg-store-ink-soft/40">
            <span className="rounded-full bg-white px-md py-xs text-xs font-bold text-store-ink-soft">
              Agotado
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-lg">
        <span className="truncate text-xs font-medium text-store-ink-mute">{producto.categoria_nombre}</span>

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-store-ink">
          {producto.nombre}
        </h3>

        <div className="flex items-baseline gap-2.5">
          {enOferta && producto.precio_oferta !== null ? (
            <>
              <span className="font-mono text-xl font-bold text-store-offer">
                {formatearPrecio(producto.precio_oferta)}
              </span>
              <span className="font-mono text-[13px] text-store-ink-mute line-through">
                {formatearPrecio(producto.precio_regular)}
              </span>
            </>
          ) : (
            <span className="font-mono text-xl font-bold text-store-ink">
              {formatearPrecio(producto.precio_regular)}
            </span>
          )}
        </div>

        {colorNombre && (
          <span className="flex items-center gap-xs text-xs text-store-ink-mute">
            {colorHex && (
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-store-line"
                style={{ backgroundColor: colorHex }}
                aria-hidden="true"
              />
            )}
            <span className="truncate">{colorNombre}</span>
          </span>
        )}

        <span
          className={cn(
            'text-xs',
            producto.disponible ? 'text-store-ok' : 'text-store-ink-mute'
          )}
        >
          {producto.disponible ? 'En stock' : 'Sin stock'}
        </span>

        <span className="mt-auto flex h-10 items-center justify-center rounded-md bg-store-ink text-xs font-semibold text-white transition-colors group-hover:bg-store-ink/90">
          Ver producto
        </span>
      </div>
    </Link>
  );
}

/** Skeleton que calca la forma exacta de la tarjeta. */
export function ProductCardSkeleton(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col overflow-hidden rounded-lg border border-store-line bg-store-surface"
    >
      <div className="aspect-square w-full bg-store-line/60" />
      <div className="flex flex-col gap-md p-lg">
        <div className="h-2.5 w-1/3 rounded-full bg-store-line" />
        <div className="h-4 w-4/5 rounded-full bg-store-line" />
        <div className="h-5 w-1/2 rounded-full bg-store-line" />
        <div className="h-4 w-1/3 rounded-full bg-store-line" />
        <div className="h-10 w-full rounded-md bg-store-line/60" />
      </div>
    </div>
  );
}

export default ProductCard;
