import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MapaUbicacionPicker from './MapaUbicacionPicker';

// Se simula `@vis.gl/react-google-maps` para no inyectar el SDK real de Google
// (requiere red y clave). Así se prueba la lógica del componente en aislamiento.
const mocks = vi.hoisted(() => {
  const fakeMap = {
    getCenter: vi.fn(() => ({ lat: () => -12.1219, lng: () => -77.0297 })),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    panTo: vi.fn(),
    setZoom: vi.fn(),
  };
  const geocode = vi.fn();
  class GeocoderFake {
    geocode = geocode;
  }
  return { fakeMap, geocode, GeocoderFake };
});

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Map: ({ children }: { children?: React.ReactNode }) => <div data-testid="mapa">{children}</div>,
  useMap: () => mocks.fakeMap,
  useMapsLibrary: () => ({ Geocoder: mocks.GeocoderFake }),
}));

const resultadoMiraflores = {
  address_components: [
    { long_name: 'Av. José Larco', short_name: 'Av. José Larco', types: ['route'] },
    { long_name: '123', short_name: '123', types: ['street_number'] },
    { long_name: 'Miraflores', short_name: 'Miraflores', types: ['administrative_area_level_3'] },
    { long_name: 'Lima', short_name: 'Lima', types: ['administrative_area_level_2'] },
    { long_name: 'Lima', short_name: 'Lima', types: ['administrative_area_level_1'] },
  ],
};

const onConfirmar = vi.fn();
const onCancelar = vi.fn();

function montar(): void {
  render(
    <MapaUbicacionPicker
      centroInicial={null}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
    />
  );
}

const getCurrentPosition = vi.fn();

describe('MapaUbicacionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'AIza-clave-de-prueba');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  });

  it('renderiza el mapa y el botón de confirmación cuando hay clave', () => {
    montar();

    expect(screen.getByTestId('mapa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar esta ubicación' })).toBeInTheDocument();
  });

  it('geocodifica el centro y propaga los datos al confirmar', async () => {
    mocks.geocode.mockResolvedValue({ results: [resultadoMiraflores] });
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Usar esta ubicación' }));

    await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
    expect(onConfirmar).toHaveBeenCalledWith({
      latitud: -12.1219,
      longitud: -77.0297,
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      direccion_linea: 'Av. José Larco 123',
      codigo_postal: null,
    });
  });

  it('avisa y ofrece reintentar cuando el punto no tiene dirección', async () => {
    mocks.geocode.mockResolvedValue({ results: [] });
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Usar esta ubicación' }));

    expect(await screen.findByText(/No encontramos una dirección/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('avisa y ofrece reintentar cuando la geocodificación falla', async () => {
    mocks.geocode.mockRejectedValue(new Error('cuota agotada'));
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Usar esta ubicación' }));

    expect(await screen.findByText(/No pudimos obtener la dirección/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('cancela sin confirmar', () => {
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('centra el mapa en la ubicación GPS del navegador', async () => {
    getCurrentPosition.mockImplementation((exito: PositionCallback) => {
      exito({ coords: { latitude: -12.05, longitude: -77.05 } } as GeolocationPosition);
    });
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ir a mi ubicación actual' }));

    await waitFor(() =>
      expect(mocks.fakeMap.panTo).toHaveBeenCalledWith({ lat: -12.05, lng: -77.05 })
    );
    expect(mocks.fakeMap.setZoom).toHaveBeenCalledWith(17);
    expect(await screen.findByText(/Punto actual: -12\.05000, -77\.05000/)).toBeInTheDocument();
  });

  it('avisa cuando el navegador deniega el acceso a la ubicación', async () => {
    getCurrentPosition.mockImplementation(
      (_exito: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError);
      }
    );
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ir a mi ubicación actual' }));

    expect(await screen.findByText(/No pudimos acceder a tu ubicación/)).toBeInTheDocument();
    expect(mocks.fakeMap.panTo).not.toHaveBeenCalled();
  });

  it('avisa cuando el navegador no soporta geolocalización', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Ir a mi ubicación actual' }));

    expect(screen.getByText(/no permite obtener la ubicación actual/)).toBeInTheDocument();
  });

  it('muestra un aviso claro cuando falta la clave de Google Maps', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    montar();

    expect(screen.getByText('El mapa no está disponible')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Escribir la dirección manualmente' }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });
});
