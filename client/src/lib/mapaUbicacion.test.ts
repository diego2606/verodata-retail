import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  LIMA_CENTRO,
  formatearCoordenadas,
  obtenerApiKeyGoogleMaps,
  parseUbicacionGeocodificada,
  type ComponenteDireccionGoogle,
  type ResultadoGeocodificacion,
} from './mapaUbicacion';

function componente(long_name: string, types: string[]): ComponenteDireccionGoogle {
  return { long_name, short_name: long_name, types };
}

const resultadoLima: ResultadoGeocodificacion = {
  address_components: [
    componente('Av. José Larco', ['route']),
    componente('123', ['street_number']),
    componente('Miraflores', ['administrative_area_level_3', 'locality']),
    componente('Lima', ['administrative_area_level_2', 'locality']),
    componente('Lima', ['administrative_area_level_1']),
    componente('15074', ['postal_code']),
  ],
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('obtenerApiKeyGoogleMaps', () => {
  it('devuelve la clave cuando está configurada', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'AIza-clave-publica');
    expect(obtenerApiKeyGoogleMaps()).toBe('AIza-clave-publica');
  });

  it('devuelve null cuando la clave está vacía o solo tiene espacios', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '   ');
    expect(obtenerApiKeyGoogleMaps()).toBeNull();
  });
});

describe('parseUbicacionGeocodificada', () => {
  it('extrae los campos del formulario y conserva el punto elegido', () => {
    const ubicacion = parseUbicacionGeocodificada(resultadoLima, { lat: -12.1219, lng: -77.0297 });
    expect(ubicacion).toEqual({
      latitud: -12.1219,
      longitud: -77.0297,
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      direccion_linea: 'Av. José Larco 123',
      codigo_postal: '15074',
    });
  });

  it('usa locality como distrito cuando no hay administrative_area_level_3', () => {
    const ubicacion = parseUbicacionGeocodificada(
      { address_components: [componente('Surco', ['locality'])] },
      LIMA_CENTRO
    );
    expect(ubicacion.distrito).toBe('Surco');
    expect(ubicacion.direccion_linea).toBeNull();
  });

  it('devuelve direccion_linea nula si solo hay calle sin número', () => {
    const ubicacion = parseUbicacionGeocodificada(
      { address_components: [componente('Av. Larco', ['route'])] },
      LIMA_CENTRO
    );
    expect(ubicacion.direccion_linea).toBe('Av. Larco');
  });

  it('no revienta con una respuesta sin componentes', () => {
    const ubicacion = parseUbicacionGeocodificada({ address_components: [] }, LIMA_CENTRO);
    expect(ubicacion.departamento).toBeNull();
    expect(ubicacion.codigo_postal).toBeNull();
    expect(ubicacion.latitud).toBe(LIMA_CENTRO.lat);
  });

  it('ignora componentes con nombre vacío', () => {
    const ubicacion = parseUbicacionGeocodificada(
      { address_components: [componente('   ', ['route']), componente('Surco', ['locality'])] },
      LIMA_CENTRO
    );
    expect(ubicacion.direccion_linea).toBeNull();
    expect(ubicacion.distrito).toBe('Surco');
  });
});

describe('formatearCoordenadas', () => {
  it('muestra las coordenadas con 5 decimales', () => {
    expect(formatearCoordenadas({ lat: -12.1219234, lng: -77.0297123 })).toBe('-12.12192, -77.02971');
  });
});
