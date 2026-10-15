import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronsDown, Facebook, Instagram, LockKeyhole, Youtube } from 'lucide-react';

interface EnlaceFooter {
  label: string;
  to: string;
}

const COLUMNAS: Array<{ titulo: string; enlaces: EnlaceFooter[] }> = [
  {
    titulo: 'Comprar',
    enlaces: [
      { label: 'Todo el catálogo', to: '/catalogo' },
      { label: 'Ofertas de la semana', to: '/catalogo' },
      { label: 'Nuevos ingresos', to: '/catalogo' },
      { label: 'Calzado', to: '/catalogo' },
      { label: 'Ropa', to: '/catalogo' },
      { label: 'Accesorios', to: '/catalogo' },
    ],
  },
  {
    titulo: 'Ayuda',
    enlaces: [
      { label: 'Cambios y devoluciones', to: '/catalogo' },
      { label: 'Rastrea tu pedido', to: '/catalogo' },
      { label: 'Guía de tallas', to: '/catalogo' },
      { label: 'Preguntas frecuentes', to: '/catalogo' },
      { label: 'Venta telefónica', to: '/catalogo' },
    ],
  },
  {
    titulo: 'Nosotros',
    enlaces: [
      { label: 'Sobre VeroData', to: '/catalogo' },
      { label: 'Nuestras tiendas', to: '/catalogo' },
      { label: 'Términos y condiciones', to: '/catalogo' },
      { label: 'Política de privacidad', to: '/catalogo' },
      { label: 'Libro de reclamaciones', to: '/catalogo' },
    ],
  },
];

const MEDIOS_PAGO = ['Yape', 'Plin', 'Visa', 'Mastercard', 'Transferencia'];

const REDES: Array<{ label: string; Icono: typeof Instagram }> = [
  { label: 'Instagram', Icono: Instagram },
  { label: 'Facebook', Icono: Facebook },
  { label: 'YouTube', Icono: Youtube },
];

/** Footer global del Storefront. */
export function FooterTienda(): React.ReactElement {
  return (
    <footer className="w-full bg-store-ink">
      <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-10 px-lg pb-6 pt-12">
        {/* Marca + directorio */}
        <div className="flex flex-col gap-xl lg:flex-row lg:gap-16">
          <div className="flex w-full flex-col gap-5 lg:w-[320px] lg:shrink-0">
            <Link to="/" className="flex items-center gap-sm" aria-label="VeroData Retail, ir al inicio">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white">
                <ChevronsDown size={20} aria-hidden="true" className="text-store-ink" />
              </span>
              <span className="flex flex-col">
                <span className="text-[26px] leading-none text-white">VeroData</span>
                <span className="text-[9px] font-semibold leading-none text-store-ink-mute">Retail</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-store-ink-mute">
              Calzado, indumentaria y accesorios con envíos a todo el Perú.
            </p>

            <div className="flex flex-col gap-xs">
              <span className="font-mono text-sm text-white">(01) 480 2000</span>
              <span className="text-xs text-store-ink-mute">Lun a Sáb, 9:00 – 20:00</span>
            </div>

            <div className="flex items-center gap-lg">
              {REDES.map(({ label, Icono }) => (
                <Link key={label} to="/catalogo" aria-label={label} className="text-white hover:text-store-ink-mute">
                  <Icono size={20} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid flex-1 gap-xl sm:grid-cols-3 lg:gap-10">
            {COLUMNAS.map((columna) => (
              <div key={columna.titulo} className="flex flex-col gap-lg">
                <span className="text-sm font-semibold text-white">{columna.titulo}</span>
                <nav className="flex flex-col gap-md" aria-label={columna.titulo}>
                  {columna.enlaces.map((enlace) => (
                    <Link
                      key={enlace.label}
                      to={enlace.to}
                      className="text-xs text-store-ink-mute transition-colors hover:text-white"
                    >
                      {enlace.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Medios de pago */}
        <div className="flex flex-col gap-md border-t border-store-ink-soft pt-6 lg:flex-row lg:items-center lg:gap-lg">
          <span className="text-xs font-semibold text-white">Pago seguro</span>
          <div className="flex flex-wrap items-center gap-sm">
            {MEDIOS_PAGO.map((medio) => (
              <span
                key={medio}
                className="rounded-md border border-store-ink-soft px-md py-sm text-[11px] font-semibold text-white"
              >
                {medio}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-sm text-xs text-store-ink-mute lg:ml-auto">
            <LockKeyhole size={16} aria-hidden="true" />
            Tus datos viajan cifrados
          </span>
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-sm border-t border-store-ink-soft pt-6 text-[11px] text-store-ink-mute sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} VeroData Retail S.A.C. Todos los derechos reservados.</span>
          <span>Precios en soles peruanos (PEN).</span>
        </div>
      </div>
    </footer>
  );
}

export default FooterTienda;
