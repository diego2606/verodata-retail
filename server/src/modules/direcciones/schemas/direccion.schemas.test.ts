import { describe, it, expect } from 'vitest';
import {
  actualizarDireccionSchema,
  crearDireccionSchema,
} from './direccion.schemas';

const base = {
  departamento: 'Lima',
  provincia: 'Lima',
  distrito: 'Miraflores',
  direccion_linea: 'Av. Larco 123',
};

describe('direccion.schemas — geolocalización (migración 012)', () => {
  it('acepta una dirección con coordenadas válidas', () => {
    const parsed = crearDireccionSchema.safeParse({ ...base, latitud: -12.1219, longitud: -77.0297 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.latitud).toBe(-12.1219);
      expect(parsed.data.longitud).toBe(-77.0297);
    }
  });

  it('acepta una dirección sin coordenadas (las deja opcionales)', () => {
    const parsed = crearDireccionSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it('acepta coordenadas nulas explícitas', () => {
    const parsed = crearDireccionSchema.safeParse({ ...base, latitud: null, longitud: null });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.latitud).toBeNull();
  });

  it('normaliza cadena vacía a null', () => {
    const parsed = crearDireccionSchema.safeParse({ ...base, latitud: '', longitud: '' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.latitud).toBeNull();
      expect(parsed.data.longitud).toBeNull();
    }
  });

  it('rechaza una latitud fuera de rango', () => {
    const parsed = crearDireccionSchema.safeParse({ ...base, latitud: 95 });
    expect(parsed.success).toBe(false);
  });

  it('rechaza una longitud fuera de rango', () => {
    const parsed = crearDireccionSchema.safeParse({ ...base, longitud: -200 });
    expect(parsed.success).toBe(false);
  });

  it('permite actualizar solo las coordenadas', () => {
    const parsed = actualizarDireccionSchema.safeParse({ latitud: -12.5, longitud: -77.1 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.latitud).toBe(-12.5);
  });

  it('exige al menos un campo al actualizar', () => {
    const parsed = actualizarDireccionSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });
});
