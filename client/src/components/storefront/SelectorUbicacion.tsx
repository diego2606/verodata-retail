import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, MapPin, Plus, Search, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useLoginModal } from '../../context/LoginModalContext';
import { cuentaApi } from '../../lib/cuenta';
import { cn } from '../../lib/utils';
import {
  filtrarDirecciones,
  guardarUbicacionEntrega,
  leerUbicacionEntrega,
  resolverUbicacion,
  ubicacionDesdeDireccion,
  type UbicacionEntrega,
} from '../../lib/ubicacionEntrega';
import type { DireccionItem } from '../../types/cuenta.types';

type EstadoCarga = 'cargando' | 'listo' | 'error';

/** Sub-bar de ubicación del header: "Entrega en: [Distrito]" + popover (ux skill §2). */
export function SelectorUbicacion(): React.ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { abrirLogin } = useLoginModal();

  const [direcciones, setDirecciones] = useState<DireccionItem[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [recargaKey, setRecargaKey] = useState(0);
  const [elegida, setElegida] = useState<UbicacionEntrega | null>(leerUbicacionEntrega);
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<UbicacionEntrega | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const contenedorRef = useRef<HTMLDivElement>(null);
  const busquedaRef = useRef<HTMLInputElement>(null);

  // Carga la libreta para poder mostrar la principal desde el primer render.
  useEffect(() => {
    if (!isAuthenticated) {
      setDirecciones([]);
      setEstado('listo');
      return;
    }
    let activo = true;
    setEstado('cargando');
    cuentaApi
      .listarDirecciones()
      .then((json) => {
        if (!activo) return;
        setDirecciones(json.success ? json.data : []);
        setEstado(json.success ? 'listo' : 'error');
      })
      .catch(() => {
        if (activo) setEstado('error');
      });
    return () => {
      activo = false;
    };
  }, [isAuthenticated, recargaKey]);

  // Cierra con Escape o al clicar fuera (S6848: listener de documento, no en el div).
  useEffect(() => {
    if (!abierto) return;
    const alTeclado = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setAbierto(false);
    };
    const alClicFuera = (event: MouseEvent): void => {
      const contenedor = contenedorRef.current;
      if (contenedor && event.target instanceof Node && !contenedor.contains(event.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('keydown', alTeclado);
    document.addEventListener('mousedown', alClicFuera);
    return () => {
      document.removeEventListener('keydown', alTeclado);
      document.removeEventListener('mousedown', alClicFuera);
    };
  }, [abierto]);

  const abrir = useCallback((): void => {
    setSeleccion(resolverUbicacion(elegida, direcciones));
    setBusqueda('');
    setAbierto(true);
  }, [elegida, direcciones]);

  // Al abrir, el foco entra directo al buscador.
  useEffect(() => {
    if (abierto) busquedaRef.current?.focus();
  }, [abierto]);

  const vigente = useMemo(() => resolverUbicacion(elegida, direcciones), [elegida, direcciones]);
  const visibles = useMemo(() => filtrarDirecciones(direcciones, busqueda), [direcciones, busqueda]);

  const confirmar = (): void => {
    if (!seleccion) return;
    setElegida(seleccion);
    guardarUbicacionEntrega(seleccion);
    setAbierto(false);
  };

  const irADirecciones = (): void => {
    setAbierto(false);
    void navigate('/cuenta/perfil?seccion=direcciones');
  };

  const etiqueta = vigente?.distrito ?? (estado === 'cargando' ? 'Cargando…' : 'Elegir distrito');

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className="flex items-center gap-sm text-store-ink-soft hover:text-store-ink"
      >
        <MapPin size={16} aria-hidden="true" />
        Entrega en: <span className="font-medium text-store-ink">{etiqueta}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn('transition-transform', abierto && 'rotate-180')}
        />
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Seleccionar ubicación de entrega"
          className="absolute right-0 top-[calc(100%+8px)] z-40 flex w-[376px] max-w-[calc(100vw-2.5rem)] flex-col gap-[14px] rounded-lg border border-store-line bg-store-surface p-[20px]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-store-ink">Ubicación</h2>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="text-store-ink-soft transition-colors hover:text-store-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-store-ink-soft">
            Elige el distrito donde quieres recibir tu pedido.
          </p>

          <div className="flex h-11 items-center gap-sm rounded-md border border-store-line px-md transition-colors focus-within:border-store-accent">
            <Search size={18} className="shrink-0 text-store-ink-soft" aria-hidden="true" />
            <input
              ref={busquedaRef}
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar distrito o dirección"
              aria-label="Buscar distrito o dirección"
              className="h-full flex-1 bg-transparent text-sm text-store-ink outline-none placeholder:text-store-ink-mute"
            />
          </div>

          <div className="flex max-h-64 flex-col gap-xxs overflow-y-auto">
            {estado === 'cargando' &&
              [0, 1, 2].map((fila) => (
                <div key={fila} className="flex items-center gap-sm px-sm py-sm" aria-hidden="true">
                  <div className="h-5 w-5 animate-pulse rounded-full bg-store-line/60" />
                  <div className="flex flex-1 flex-col gap-xs">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-store-line/60" />
                    <div className="h-2.5 w-36 animate-pulse rounded-full bg-store-line/60" />
                  </div>
                </div>
              ))}

            {estado === 'error' && (
              <div className="flex flex-col items-center gap-sm py-lg text-center">
                <p className="text-sm text-store-ink-soft">No pudimos cargar tus direcciones.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setRecargaKey((k) => k + 1)}
                >
                  Reintentar
                </Button>
              </div>
            )}

            {estado === 'listo' && !isAuthenticated && (
              <div className="flex flex-col items-center gap-sm rounded-md border border-dashed border-store-line py-lg text-center">
                <MapPin size={18} className="text-store-ink-mute" aria-hidden="true" />
                <p className="text-sm font-medium text-store-ink">Inicia sesión para ver tus direcciones</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAbierto(false);
                    abrirLogin();
                  }}
                >
                  Ingresar
                </Button>
              </div>
            )}

            {estado === 'listo' && isAuthenticated && visibles.length === 0 && (
              <div className="flex flex-col items-center gap-sm rounded-md border border-dashed border-store-line py-lg text-center">
                <MapPin size={18} className="text-store-ink-mute" aria-hidden="true" />
                <p className="text-sm font-medium text-store-ink">
                  {busqueda.trim() ? 'Sin resultados' : 'Aún no tienes direcciones'}
                </p>
                <p className="text-xs text-store-ink-soft">
                  {busqueda.trim()
                    ? 'Prueba con otro distrito o dirección.'
                    : 'Agrega una para elegir tu zona de entrega.'}
                </p>
                {!busqueda.trim() && (
                  <Button type="button" variant="secondary" size="sm" onClick={irADirecciones}>
                    <Plus size={13} aria-hidden="true" />
                    Agregar dirección
                  </Button>
                )}
              </div>
            )}

            {estado === 'listo' &&
              visibles.map((direccion) => {
                const activa = seleccion?.direccionId === direccion.id;
                return (
                  <button
                    key={direccion.id}
                    type="button"
                    onClick={() => setSeleccion(ubicacionDesdeDireccion(direccion))}
                    aria-pressed={activa}
                    className={cn(
                      'flex items-center gap-sm rounded-md px-sm py-sm text-left transition-colors',
                      activa ? 'bg-store-canvas' : 'hover:bg-store-canvas'
                    )}
                  >
                    <MapPin
                      size={20}
                      aria-hidden="true"
                      className={cn('shrink-0', activa ? 'text-store-accent' : 'text-store-ink-mute')}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-xxs">
                      <span className="text-[13px] font-semibold leading-4 text-store-ink">
                        {direccion.distrito}
                        {direccion.es_principal && (
                          <span className="ml-sm text-[11px] font-normal text-store-ink-mute">Principal</span>
                        )}
                      </span>
                      <span className="truncate text-[11px] leading-tight text-store-ink-soft">
                        {direccion.provincia} · {direccion.direccion_linea}
                      </span>
                    </span>
                    {activa && <Check size={18} aria-hidden="true" className="shrink-0 text-store-accent" />}
                  </button>
                );
              })}
          </div>

          <Button
            type="button"
            onClick={confirmar}
            disabled={!seleccion}
            className="h-10 rounded-md bg-store-ink text-xs font-semibold text-white hover:bg-store-ink/90"
          >
            Confirmar ubicación
          </Button>
        </div>
      )}
    </div>
  );
}

export default SelectorUbicacion;
