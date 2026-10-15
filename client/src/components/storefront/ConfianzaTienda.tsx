import React from 'react';
import { CreditCard, RefreshCcw, Smartphone, Truck, type LucideIcon } from 'lucide-react';
import type { FranjaConfianza } from '../../lib/portada';

interface ConfianzaTiendaProps {
  items: FranjaConfianza[];
}

/** Iconos fijos por posición: envío, devoluciones, pagos móviles, tarjetas. */
const ICONOS: LucideIcon[] = [Truck, RefreshCcw, Smartphone, CreditCard];

/** Franja de beneficios de compra ("Compra con confianza"). */
export function ConfianzaTienda({ items }: ConfianzaTiendaProps): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Compra con confianza"
      className="w-full border-t border-store-line bg-store-surface"
    >
      <div className="mx-auto w-full max-w-[1312px] px-lg py-10">
        <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {items.map((item, index) => {
            const Icono = ICONOS[index % ICONOS.length];
            return (
              <div key={`${item.titulo}-${index}`} className="flex flex-col gap-md">
                <Icono size={28} aria-hidden="true" className="text-store-ink" />
                <span className="text-base font-semibold text-store-ink">{item.titulo}</span>
                <span className="text-[13px] leading-relaxed text-store-ink-soft">{item.texto}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ConfianzaTienda;
