import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { LocateFixed, MapPin, TriangleAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  LIMA_CENTRO,
  formatearCoordenadas,
  obtenerApiKeyGoogleMaps,
  parseUbicacionGeocodificada,
  type Coordenadas,
  type UbicacionSeleccionada,
} from '../../lib/mapaUbicacion';

export interface MapaUbicacionPickerProps {
  /** Punto donde abrir el mapa (si la dirección ya tenía coordenadas). */
  centroInicial: Coordenadas | null;
  onConfirmar: (ubicacion: UbicacionSeleccionada) => void;
  onCancelar: () => void;
}

type Estado = 'listo' | 'buscando' | 'error' | 'sin-resultados';

/**
 * Escucha el evento `idle` del mapa (se dispara una vez que termina cada
 * arrastre/zoom) y notifica el centro. Evita re-renderizar en cada frame
 * mientras el usuario mueve el mapa. También expone la instancia del mapa
 * al padre para poder leer su centro exacto al confirmar.
 */
function EscuchaCentro({
  onCambio,
  mapaRef,
}: {
  onCambio: (centro: Coordenadas) => void;
  mapaRef: React.MutableRefObject<google.maps.Map | null>;
}): null {
  const map = useMap();
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;

  useEffect(() => {
    mapaRef.current = map;
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const centro = map.getCenter();
      if (centro) onCambioRef.current({ lat: centro.lat(), lng: centro.lng() });
    });
    return () => {
      listener.remove();
      mapaRef.current = null;
    };
  }, [map, mapaRef]);

  return null;
}

function SelectorInterno({
  centroInicial,
  onConfirmar,
  onCancelar,
}: MapaUbicacionPickerProps): React.ReactElement {
  const centroPorDefecto = centroInicial ?? LIMA_CENTRO;
  const mapaRef = useRef<google.maps.Map | null>(null);
  const geocoding = useMapsLibrary('geocoding');
  const [centro, setCentro] = useState<Coordenadas>(centroPorDefecto);
  const [estado, setEstado] = useState<Estado>('listo');
  const [ubicando, setUbicando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  /** Centra el mapa en la ubicación GPS del navegador (requiere HTTPS o localhost). */
  const irAMiUbicacion = useCallback((): void => {
    if (!navigator.geolocation) {
      setMensaje('Tu navegador no permite obtener la ubicación actual.');
      return;
    }
    setUbicando(true);
    setMensaje(null);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const punto: Coordenadas = {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
        };
        setUbicando(false);
        setEstado('listo');
        mapaRef.current?.panTo(punto);
        mapaRef.current?.setZoom(17);
        setCentro(punto);
      },
      () => {
        setUbicando(false);
        setMensaje('No pudimos acceder a tu ubicación. Revisa los permisos del navegador e inténtalo de nuevo.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const confirmar = useCallback(async (): Promise<void> => {
    if (!geocoding) return;
    setEstado('buscando');
    setMensaje(null);

    // Se lee el centro directo del mapa para no depender de un estado rezagado.
    const centroActual = mapaRef.current?.getCenter();
    const punto: Coordenadas = centroActual
      ? { lat: centroActual.lat(), lng: centroActual.lng() }
      : centro;

    try {
      const { results } = await new geocoding.Geocoder().geocode({ location: punto });
      const primero = results[0];
      if (!primero) {
        setEstado('sin-resultados');
        setMensaje('No encontramos una dirección en ese punto. Acerca el mapa a una calle y vuelve a intentarlo.');
        return;
      }
      setEstado('listo');
      onConfirmar(parseUbicacionGeocodificada(primero, punto));
    } catch {
      setEstado('error');
      setMensaje('No pudimos obtener la dirección del punto. Revisa tu conexión e inténtalo de nuevo.');
    }
  }, [geocoding, centro, onConfirmar]);

  const hayError = estado === 'error' || estado === 'sin-resultados';

  return (
    <div className="space-y-sm">
      <div className="relative h-72 w-full overflow-hidden rounded-md border border-store-line bg-store-canvas sm:h-96">
        <Map
          defaultCenter={centroPorDefecto}
          defaultZoom={16}
          gestureHandling="greedy"
          fullscreenControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <EscuchaCentro onCambio={setCentro} mapaRef={mapaRef} />
        </Map>
        {/* Pin fijo: la ubicación elegida es siempre el centro del mapa. */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin size={34} className="text-store-offer drop-shadow-md" aria-hidden="true" />
        </span>
        {/* Control "mi ubicación": centra el mapa en el GPS del navegador. */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          isLoading={ubicando}
          onClick={irAMiUbicacion}
          aria-label="Ir a mi ubicación actual"
          title="Ir a mi ubicación actual"
          className="absolute right-3 top-3 z-10 h-9 w-9 border-store-line bg-store-surface text-store-ink shadow-sm hover:bg-store-canvas"
        >
          {!ubicando && <LocateFixed size={16} aria-hidden="true" />}
        </Button>
      </div>

      <p className="text-xs text-store-ink-soft" aria-live="polite">
        {estado === 'buscando'
          ? 'Buscando la dirección del punto…'
          : `Arrastra el mapa hasta tu puerta. Punto actual: ${formatearCoordenadas(centro)}`}
      </p>

      {mensaje && (
        <p role="alert" aria-live="polite" className="flex items-start gap-xs text-xs text-store-offer">
          <TriangleAlert size={13} className="mt-xxs shrink-0" aria-hidden="true" />
          {mensaje}
        </p>
      )}

      <div className="flex items-center justify-end gap-sm">
        <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          isLoading={estado === 'buscando'}
          disabled={!geocoding}
          onClick={() => void confirmar()}
          className="rounded-md bg-store-ink text-white hover:bg-store-ink/90"
        >
          {hayError ? 'Reintentar' : geocoding ? 'Usar esta ubicación' : 'Cargando mapa…'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Selector de ubicación con Google Maps.
 *
 * El script del SDK se inyecta **recién cuando este componente se monta**
 * (`APIProvider`), y el componente se importa con `React.lazy` desde el
 * formulario de direcciones. Resultado: un cliente que solo mira productos
 * nunca descarga el bundle de la librería ni el script de Google, y por tanto
 * no consume cuota de la API.
 */
export default function MapaUbicacionPicker(props: MapaUbicacionPickerProps): React.ReactElement {
  const apiKey = obtenerApiKeyGoogleMaps();

  if (!apiKey) {
    return (
      <div className="rounded-md border border-dashed border-store-line bg-store-canvas p-md">
        <p className="flex items-center gap-xs text-sm font-medium text-store-ink">
          <TriangleAlert size={15} className="text-store-ink-mute" aria-hidden="true" />
          El mapa no está disponible
        </p>
        <p className="mt-xs text-xs text-store-ink-soft">
          Falta configurar la clave <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> en el entorno del
          frontend. Mientras tanto puedes escribir los datos de tu dirección a mano.
        </p>
        <div className="mt-md flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={props.onCancelar}>
            Escribir la dirección manualmente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['geocoding']} region="PE" language="es">
      <SelectorInterno {...props} />
    </APIProvider>
  );
}
