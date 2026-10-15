/**
 * Utilidades de geolocalización del selector de mapa (HU017).
 *
 * Toda la lógica no dependiente de Google vive aquí como funciones puras para
 * poder probarla sin cargar el SDK de Maps (que ensucia el DOM y consume cuota).
 */

/** Centro por defecto del mapa: Lima, Perú. */
export const LIMA_CENTRO: Coordenadas = { lat: -12.0464, lng: -77.0428 };

export interface Coordenadas {
  lat: number;
  lng: number;
}

/** Resultado de elegir un punto en el mapa, listo para poblar el formulario. */
export interface UbicacionSeleccionada {
  latitud: number;
  longitud: number;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  direccion_linea: string | null;
  codigo_postal: string | null;
}

/** Subconjunto estructural de `google.maps.GeocoderAddressComponent`. */
export interface ComponenteDireccionGoogle {
  long_name: string;
  short_name: string;
  types: string[];
}

/** Subconjunto estructural de `google.maps.GeocoderResult`. */
export interface ResultadoGeocodificacion {
  address_components: ComponenteDireccionGoogle[];
}

/** Jerarquía de tipos de Google para los distritos de Perú. */
const TIPO_DEPARTAMENTO = 'administrative_area_level_1';
const TIPO_PROVINCIA = 'administrative_area_level_2';
const TIPOS_DISTRITO = ['administrative_area_level_3', 'locality', 'sublocality_level_1'];

/**
 * Clave pública de Google Maps. Se lee de `VITE_*` porque el SDK de Maps corre
 * en el navegador; se restringe por HTTP referrer en Google Cloud Console.
 * Devuelve `null` si no está configurada, para no intentar cargar el script.
 */
export function obtenerApiKeyGoogleMaps(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (typeof key !== 'string') return null;
  const limpia = key.trim();
  return limpia.length > 0 ? limpia : null;
}

/** Busca el primer componente de la lista cuyo tipo coincida. */
function buscarComponente(
  componentes: ComponenteDireccionGoogle[],
  tipos: string[]
): string | null {
  for (const tipo of tipos) {
    const encontrado = componentes.find((c) => c.types.includes(tipo));
    if (encontrado && encontrado.long_name.trim().length > 0) return encontrado.long_name;
  }
  return null;
}

/**
 * Convierte el resultado de la geocodificación inversa en los campos del
 * formulario. Las coordenadas siempre provienen del punto marcado (`centro`),
 * que es exactamente lo que el usuario eligió.
 */
export function parseUbicacionGeocodificada(
  resultado: ResultadoGeocodificacion,
  centro: Coordenadas
): UbicacionSeleccionada {
  const componentes = resultado.address_components ?? [];

  const calle = buscarComponente(componentes, ['route']);
  const numero = buscarComponente(componentes, ['street_number']);
  const direccionLinea = [calle, numero].filter(Boolean).join(' ') || null;

  return {
    latitud: centro.lat,
    longitud: centro.lng,
    departamento: buscarComponente(componentes, [TIPO_DEPARTAMENTO]),
    provincia: buscarComponente(componentes, [TIPO_PROVINCIA]),
    distrito: buscarComponente(componentes, TIPOS_DISTRITO),
    direccion_linea: direccionLinea,
    codigo_postal: buscarComponente(componentes, ['postal_code']),
  };
}

/** Formatea unas coordenadas para mostrarlas (5 decimales ≈ 1 m). */
export function formatearCoordenadas(coordenadas: Coordenadas): string {
  return `${coordenadas.lat.toFixed(5)}, ${coordenadas.lng.toFixed(5)}`;
}
