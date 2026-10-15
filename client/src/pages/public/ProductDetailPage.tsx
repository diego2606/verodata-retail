import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, RefreshCcw, ShieldCheck, Truck } from 'lucide-react';
import { useApiData } from '../../lib/useApiData';
import { cn, CONTENEDOR_TIENDA } from '../../lib/utils';
import { formatearPrecio } from '../../lib/storefront';
import { useColores } from '../../context/ColoresContext';
import { Button } from '../../components/ui/Button';
import { EstadoError } from '../../components/storefront/Estados';
import type { DetalleProducto, ProductoPublico } from '../../types/storefront.types';

const CONTENEDOR = CONTENEDOR_TIENDA;

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

/** Ejes que se ofrecen en el selector de variantes (solo si tienen >1 valor). */
const EJES_SELECTOR = ['COLOR', 'SIZE', 'STORAGE_CAPACITY', 'CAPACITY'];

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

      {detalle.estado.status === 'success' && (
        <Detalle key={id} producto={detalle.estado.data.producto} variantes={detalle.estado.data.variantes} />
      )}
    </div>
  );
}

interface DetalleProps {
  producto: ProductoPublico;
  variantes: ProductoPublico[];
}

function Detalle({ producto, variantes }: DetalleProps): React.ReactElement {
  const { hexDeColor } = useColores();

  // Todas las fichas del modelo (la actual + sus hermanas), sin duplicar.
  const todas = useMemo(() => {
    const mapa = new Map<string, ProductoPublico>();
    for (const v of [producto, ...variantes]) mapa.set(v.id, v);
    return [...mapa.values()];
  }, [producto, variantes]);

  // Ejes de variante que realmente varían (ej. COLOR y SIZE).
  const ejes = useMemo(
    () =>
      EJES_SELECTOR.filter(
        (k) => new Set(todas.map((v) => v.atributos[k]).filter(Boolean)).size > 1
      ),
    [todas]
  );

  const [sel, setSel] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const k of EJES_SELECTOR) init[k] = producto.atributos[k] ?? null;
    return init;
  });

  // Variante mostrada según las selecciones (con fallback a una disponible).
  const variante =
    todas.find((v) => ejes.every((k) => (v.atributos[k] ?? null) === (sel[k] ?? null))) ??
    todas.find((v) => v.disponible) ??
    producto;

  const enOferta = variante.descuento_pct > 0 && variante.precio_oferta !== null;
  const atributos = descripcionAtributos(variante);

  const opcionesEje = (eje: string): string[] =>
    [...new Set(todas.map((v) => v.atributos[eje]).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true })
    );

  /** Variante que existe para (eje=valor) manteniendo las otras selecciones. */
  const varianteDe = (eje: string, valor: string): ProductoPublico | undefined =>
    todas.find(
      (v) =>
        (v.atributos[eje] ?? null) === valor &&
        ejes.filter((k) => k !== eje).every((k) => (v.atributos[k] ?? null) === (sel[k] ?? null))
    );

  const seleccionar = (eje: string, valor: string): void =>
    setSel((prev) => ({ ...prev, [eje]: valor }));

  return (
    <div className="grid gap-xl md:grid-cols-2">
      {/* Galería */}
      <div className="relative aspect-square overflow-hidden rounded-lg border border-store-line bg-store-surface">
        {variante.imagen_url ? (
          <img src={variante.imagen_url} alt={variante.nombre} className="h-full w-full object-contain p-xl" />
        ) : (
          <div className="flex h-full items-center justify-center text-store-ink-mute">
            <ImageOff size={48} aria-hidden="true" />
          </div>
        )}
        {!variante.disponible && (
          <span className="absolute inset-0 flex items-center justify-center bg-store-surface/75 text-sm font-semibold uppercase tracking-wide text-store-ink">
            Agotado
          </span>
        )}
      </div>

      {/* Información */}
      <div className="flex flex-col gap-md">
        <span className="text-xs uppercase tracking-wide text-store-ink-mute">{variante.categoria_nombre}</span>
        <h1 className="text-display-md font-semibold text-store-ink">{variante.nombre}</h1>
        <span className="font-mono text-xs text-store-ink-mute">SKU {variante.sku}</span>

        <div className="flex flex-wrap items-baseline gap-md">
          {enOferta && variante.precio_oferta !== null ? (
            <>
              <span className="font-mono text-3xl font-semibold text-store-offer">
                {formatearPrecio(variante.precio_oferta)}
              </span>
              <span className="font-mono text-lg text-store-ink-mute line-through">
                {formatearPrecio(variante.precio_regular)}
              </span>
              <span className="rounded-full bg-store-offer px-sm py-xxs text-xs font-semibold text-white">
                -{variante.descuento_pct}%
              </span>
            </>
          ) : (
            <span className="font-mono text-3xl font-semibold text-store-ink">
              {formatearPrecio(variante.precio_regular)}
            </span>
          )}
        </div>

        <p className={variante.disponible ? 'text-sm font-medium text-store-ok' : 'text-sm font-medium text-store-offer'}>
          {variante.disponible ? 'Disponible' : 'Agotado'}
        </p>

        {/* Selector de variantes (color → talla → …) */}
        {ejes.length > 0 && (
          <div className="flex flex-col gap-md">
            {ejes.map((eje) => {
              const valores = opcionesEje(eje);
              const esColor = eje === 'COLOR';
              return (
                <div key={eje} className="flex flex-col gap-sm">
                  <span className="text-sm font-semibold text-store-ink">
                    {ETIQUETAS_ATRIBUTO[eje] ?? eje}:{' '}
                    <span className="font-normal text-store-ink-soft">{sel[eje] ?? '—'}</span>
                  </span>
                  <div className="flex flex-wrap gap-sm">
                    {valores.map((valor) => {
                      const vari = varianteDe(eje, valor);
                      const existe = Boolean(vari);
                      const agotado = existe && !vari?.disponible;
                      const activo = sel[eje] === valor;
                      const deshabilitado = !existe || agotado;

                      if (esColor) {
                        const hex = hexDeColor(valor);
                        return (
                          <button
                            key={valor}
                            type="button"
                            disabled={deshabilitado}
                            aria-pressed={activo}
                            onClick={() => seleccionar(eje, valor)}
                            title={!existe ? `${valor} (no disponible)` : agotado ? `${valor} (agotado)` : valor}
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                              activo ? 'border-store-ink' : 'border-store-line hover:border-store-ink-mute',
                              deshabilitado && 'cursor-not-allowed opacity-40'
                            )}
                          >
                            <span
                              className="h-6 w-6 rounded-full border border-store-line"
                              style={{ backgroundColor: hex ?? '#e5e7eb' }}
                              aria-hidden="true"
                            />
                          </button>
                        );
                      }

                      return (
                        <button
                          key={valor}
                          type="button"
                          disabled={deshabilitado}
                          aria-pressed={activo}
                          onClick={() => seleccionar(eje, valor)}
                          title={!existe ? `${valor} (no disponible)` : agotado ? 'Agotado' : valor}
                          className={cn(
                            'min-w-[46px] rounded-md border px-md py-sm text-sm transition-colors',
                            activo
                              ? 'border-store-ink bg-store-ink text-white'
                              : 'border-store-line text-store-ink hover:border-store-ink',
                            !existe && 'cursor-not-allowed text-store-ink-mute line-through opacity-40',
                            agotado && 'cursor-not-allowed text-store-ink-mute line-through opacity-60'
                          )}
                        >
                          {valor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {atributos && <p className="text-sm text-store-ink-soft">{atributos}</p>}

        {variante.descripcion && (
          <p className="whitespace-pre-line text-sm text-store-ink-soft">{variante.descripcion}</p>
        )}

        <div className="flex flex-col gap-sm pt-sm">
          {variante.disponible ? (
            <>
              <Button
                variant="primary"
                disabled
                title="El carrito de compras llegará en un próximo sprint (HU020)"
                className="h-11 w-full rounded-md bg-store-ink text-white hover:bg-store-ink/90 md:w-auto md:px-xxl"
              >
                Agregar a la bolsa
              </Button>
              <span className="text-xs text-store-ink-mute">El carrito de compras estará disponible próximamente.</span>
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
