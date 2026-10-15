import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import { useApiData } from '../../lib/useApiData';
import { formatearPrecio } from '../../lib/storefront';
import { Button } from '../../components/ui/Button';
import { EstadoError } from '../../components/storefront/Estados';
import type { DetalleProducto, ProductoPublico } from '../../types/storefront.types';

const CONTENEDOR = 'mx-auto w-full max-w-[1200px] px-lg';

const ETIQUETAS_ATRIBUTO: Record<string, string> = {
  COLOR: 'Color',
  SIZE: 'Talla',
  CAPACITY: 'Capacidad',
  STORAGE_CAPACITY: 'Almacenamiento',
  BRAND: 'Marca',
  MODEL: 'Modelo',
  GENDER: 'Género',
  LINE: 'Línea',
};

function descripcionAtributos(producto: ProductoPublico): string {
  return Object.entries(producto.atributos)
    .map(([clave, valor]) => `${ETIQUETAS_ATRIBUTO[clave] ?? clave}: ${valor}`)
    .join(' · ');
}

export function ProductDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const detalle = useApiData<DetalleProducto>(id ? `/api/v1/storefront/products/${id}` : null);

  return (
    <div className={`${CONTENEDOR} flex flex-col gap-lg py-xl`}>
      <Link to="/catalogo" className="flex w-fit items-center gap-sm text-sm font-medium text-store-accent hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al catálogo
      </Link>

      {detalle.estado.status === 'loading' && <DetalleSkeleton />}

      {detalle.estado.status === 'error' && (
        <EstadoError mensaje={detalle.estado.message} onReintentar={detalle.recargar} />
      )}

      {detalle.estado.status === 'success' && <Detalle producto={detalle.estado.data.producto} variantes={detalle.estado.data.variantes} />}
    </div>
  );
}

interface DetalleProps {
  producto: ProductoPublico;
  variantes: ProductoPublico[];
}

function Detalle({ producto, variantes }: DetalleProps): React.ReactElement {
  const enOferta = producto.descuento_pct > 0 && producto.precio_oferta !== null;
  const atributos = descripcionAtributos(producto);

  return (
    <div className="grid gap-xl md:grid-cols-2">
      {/* Galería */}
      <div className="relative aspect-square overflow-hidden rounded-lg border border-store-line bg-store-surface">
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-contain p-xl" />
        ) : (
          <div className="flex h-full items-center justify-center text-store-ink-mute">
            <ImageOff size={48} aria-hidden="true" />
          </div>
        )}
        {!producto.disponible && (
          <span className="absolute inset-0 flex items-center justify-center bg-store-surface/75 text-sm font-semibold uppercase tracking-wide text-store-ink">
            Agotado
          </span>
        )}
      </div>

      {/* Información */}
      <div className="flex flex-col gap-md">
        <span className="text-xs uppercase tracking-wide text-store-ink-mute">{producto.categoria_nombre}</span>
        <h1 className="text-display-md font-semibold text-store-ink">{producto.nombre}</h1>
        <span className="font-mono text-xs text-store-ink-mute">SKU {producto.sku}</span>

        <div className="flex flex-wrap items-baseline gap-md">
          {enOferta && producto.precio_oferta !== null ? (
            <>
              <span className="font-mono text-3xl font-semibold text-store-offer">
                {formatearPrecio(producto.precio_oferta)}
              </span>
              <span className="font-mono text-lg text-store-ink-mute line-through">
                {formatearPrecio(producto.precio_regular)}
              </span>
              <span className="rounded-full bg-store-offer px-sm py-xxs text-xs font-semibold text-white">
                -{producto.descuento_pct}%
              </span>
            </>
          ) : (
            <span className="font-mono text-3xl font-semibold text-store-ink">
              {formatearPrecio(producto.precio_regular)}
            </span>
          )}
        </div>

        <p className={producto.disponible ? 'text-sm font-medium text-store-ok' : 'text-sm font-medium text-store-offer'}>
          {producto.disponible ? `Disponible · ${producto.stock_total} unidades` : 'Agotado'}
        </p>

        {atributos && <p className="text-sm text-store-ink-soft">{atributos}</p>}

        {producto.descripcion && (
          <p className="whitespace-pre-line text-sm text-store-ink-soft">{producto.descripcion}</p>
        )}

        {/* Otras variantes (mismo modelo) */}
        {variantes.length > 0 && (
          <div className="flex flex-col gap-sm">
            <span className="text-sm font-semibold text-store-ink">Otras variantes</span>
            <div className="flex flex-wrap gap-sm">
              {variantes.map((variante) => (
                <Link
                  key={variante.id}
                  to={`/producto/${variante.id}`}
                  className="rounded-full border border-store-line bg-store-surface px-md py-xs text-xs text-store-ink-soft transition-colors hover:border-store-ink hover:text-store-ink"
                >
                  {descripcionAtributos(variante) || variante.sku}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-sm pt-sm">
          {producto.disponible ? (
            <>
              <Button
                variant="primary"
                disabled
                title="El carrito de compras llegará en un próximo sprint (HU020)"
                className="h-11 w-full rounded-md bg-store-ink text-white hover:bg-store-ink/90 md:w-auto md:px-xxl"
              >
                Agregar a la bolsa
              </Button>
              <span className="text-xs text-store-ink-mute">
                El carrito de compras estará disponible próximamente.
              </span>
            </>
          ) : (
            <Button variant="secondary" disabled className="h-11 w-full rounded-md md:w-auto md:px-xxl">
              Agotado
            </Button>
          )}
        </div>

        {/* Beneficios */}
        <div className="grid gap-sm border-t border-store-line pt-md text-sm text-store-ink-soft">
          <span className="flex items-center gap-sm"><Truck size={16} aria-hidden="true" /> Envíos a todo el Perú</span>
          <span className="flex items-center gap-sm"><RefreshCcw size={16} aria-hidden="true" /> Cambios sin costo hasta 30 días</span>
          <span className="flex items-center gap-sm"><ShieldCheck size={16} aria-hidden="true" /> Compra protegida</span>
        </div>
      </div>
    </div>
  );
}

function DetalleSkeleton(): React.ReactElement {
  return (
    <div className="grid animate-pulse gap-xl md:grid-cols-2">
      <div className="aspect-square rounded-lg bg-store-line/60" />
      <div className="flex flex-col gap-md">
        <div className="h-3 w-24 rounded-full bg-store-line" />
        <div className="h-7 w-3/4 rounded-full bg-store-line" />
        <div className="h-8 w-40 rounded-full bg-store-line" />
        <div className="h-4 w-full rounded-full bg-store-line" />
        <div className="h-4 w-5/6 rounded-full bg-store-line" />
        <div className="h-11 w-48 rounded-xs bg-store-line" />
      </div>
    </div>
  );
}
