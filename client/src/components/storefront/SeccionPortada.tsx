import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SeccionPortadaProps {
  children: React.ReactNode;
  /** Clases extra del `<section>` (fondo, bordes). */
  className?: string;
  /** Etiqueta de la sección para lectores de pantalla. */
  etiqueta?: string;
}

/**
 * Sección full-bleed de la portada: el fondo llega a los bordes de la ventana
 * y el contenido se centra en 1312px. Sustituye al contenedor único que usaba
 * la portada antes del rediseño.
 */
export function SeccionPortada({
  children,
  className,
  etiqueta,
}: SeccionPortadaProps): React.ReactElement {
  return (
    <section aria-label={etiqueta} className={cn('w-full bg-store-surface', className)}>
      <div className="mx-auto w-full max-w-[1312px] px-lg py-12">{children}</div>
    </section>
  );
}

interface EncabezadoSeccionProps {
  /** Línea pequeña sobre el título (ej. "Ofertas"). */
  sobretitulo?: string | null;
  titulo: string;
  descripcion?: string | null;
  /** Destino del enlace "Ver más". Si se omite, no se muestra. */
  verMasHref?: string;
  /** Rojo comercial para las secciones de oferta. */
  acento?: 'oferta' | 'neutro';
}

/** Encabezado común de las vitrinas de la portada. */
export function EncabezadoSeccion({
  sobretitulo,
  titulo,
  descripcion,
  verMasHref = '/catalogo',
  acento = 'neutro',
}: EncabezadoSeccionProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-sm">
      {sobretitulo && (
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-wide',
            acento === 'oferta' ? 'text-store-offer' : 'text-store-ink-soft'
          )}
        >
          {sobretitulo}
        </span>
      )}

      <div className="flex items-center justify-between gap-md">
        <h2 className="text-display-md font-bold text-store-ink">{titulo}</h2>
        {verMasHref && (
          <Link
            to={verMasHref}
            className="flex shrink-0 items-center gap-xs text-sm font-semibold text-store-accent hover:underline"
          >
            Ver más
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      {descripcion && <p className="text-[15px] leading-relaxed text-store-ink-soft">{descripcion}</p>}
    </div>
  );
}
