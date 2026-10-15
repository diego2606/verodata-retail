import React from 'react';

interface CuentaCardProps {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}

/** Tarjeta centrada para las pantallas de cuenta del Storefront. */
export function CuentaCard({ titulo, subtitulo, children }: CuentaCardProps): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-[460px] py-huge">
      <div className="rounded-lg border border-store-line bg-store-surface p-xl">
        <h1 className="text-heading-lg font-semibold text-store-ink">{titulo}</h1>
        {subtitulo && <p className="mt-xs text-sm text-store-ink-soft">{subtitulo}</p>}
        <div className="mt-lg">{children}</div>
      </div>
    </div>
  );
}

export const INPUT_STORE = 'border-store-line text-store-ink focus:ring-store-accent';
export const LABEL_STORE = 'mb-xs block text-sm font-medium text-store-ink';
export const BOTON_STORE = 'h-10 w-full rounded-md bg-store-ink text-white hover:bg-store-ink/90';

/** Alerta simple del storefront (error / éxito / info). */
export function Alerta({
  tipo,
  children,
}: {
  tipo: 'error' | 'exito' | 'info';
  children: React.ReactNode;
}): React.ReactElement {
  const estilos: Record<string, string> = {
    error: 'border-store-offer/30 bg-store-offer/5 text-store-offer',
    exito: 'border-store-ok/30 bg-store-ok/5 text-store-ok',
    info: 'border-store-line bg-store-canvas text-store-ink-soft',
  };
  return (
    <div role="alert" aria-live="polite" className={`rounded-md border p-sm text-sm ${estilos[tipo]}`}>
      {children}
    </div>
  );
}
