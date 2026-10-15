import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  filtrarDirecciones,
  guardarUbicacionEntrega,
  leerUbicacionEntrega,
  resolverUbicacion,
  ubicacionDesdeDireccion,
  ubicacionPorDefecto,
  type UbicacionEntrega,
} from './ubicacionEntrega';
import type { DireccionItem } from '../types/cuenta.types';

function direccion(parcial: Partial<DireccionItem> & Pick<DireccionItem, 'id' | 'distrito'>): DireccionItem {
  return {
    usuario_id: 'u-1',
    departamento: 'Lima',
    provincia: 'Lima',
    direccion_linea: 'Av. Larco 123',
    referencia: null,
    codigo_postal: null,
    latitud: null,
    longitud: null,
    es_principal: false,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    ...parcial,
  };
}

const miraflores = direccion({ id: 'd-1', distrito: 'Miraflores', es_principal: true });
const surco = direccion({ id: 'd-2', distrito: 'Santiago de Surco', provincia: 'Lima', direccion_linea: 'Av. Benavides 2000' });
const callao = direccion({ id: 'd-3', distrito: 'Bellavista', provincia: 'Callao', departamento: 'Callao' });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('leerUbicacionEntrega / guardarUbicacionEntrega', () => {
  it('guarda y recupera la ubicación elegida', () => {
    const ubicacion: UbicacionEntrega = { direccionId: 'd-2', distrito: 'Surco', provincia: 'Lima' };
    guardarUbicacionEntrega(ubicacion);
    expect(leerUbicacionEntrega()).toEqual(ubicacion);
  });

  it('devuelve null cuando no hay nada guardado', () => {
    expect(leerUbicacionEntrega()).toBeNull();
  });

  it('devuelve null ante un JSON corrupto o incompleto', () => {
    localStorage.setItem('verodata_ubicacion_entrega', '{no-json');
    expect(leerUbicacionEntrega()).toBeNull();

    localStorage.setItem('verodata_ubicacion_entrega', JSON.stringify({ distrito: 'Surco' }));
    expect(leerUbicacionEntrega()).toBeNull();
  });
});

describe('ubicacionDesdeDireccion / ubicacionPorDefecto', () => {
  it('proyecta una dirección a ubicación de entrega', () => {
    expect(ubicacionDesdeDireccion(miraflores)).toEqual({
      direccionId: 'd-1',
      distrito: 'Miraflores',
      provincia: 'Lima',
    });
  });

  it('prefiere la dirección principal', () => {
    expect(ubicacionPorDefecto([surco, miraflores])?.direccionId).toBe('d-1');
  });

  it('cae a la primera si ninguna es principal', () => {
    expect(ubicacionPorDefecto([surco, callao])?.direccionId).toBe('d-2');
  });

  it('devuelve null sin direcciones', () => {
    expect(ubicacionPorDefecto([])).toBeNull();
  });
});

describe('resolverUbicacion', () => {
  it('mantiene la elegida mientras su dirección exista', () => {
    const elegida: UbicacionEntrega = { direccionId: 'd-3', distrito: 'Bellavista', provincia: 'Callao' };
    expect(resolverUbicacion(elegida, [miraflores, surco, callao])?.direccionId).toBe('d-3');
  });

  it('refresca los rótulos si el usuario renombró el distrito', () => {
    const elegida: UbicacionEntrega = { direccionId: 'd-2', distrito: 'Surco', provincia: 'Lima' };
    const renombrada = { ...surco, distrito: 'Surco Nuevo' };
    expect(resolverUbicacion(elegida, [miraflores, renombrada])?.distrito).toBe('Surco Nuevo');
  });

  it('cae a la principal si la dirección elegida fue borrada', () => {
    const elegida: UbicacionEntrega = { direccionId: 'd-9', distrito: 'Fantasma', provincia: 'X' };
    expect(resolverUbicacion(elegida, [miraflores, surco])?.direccionId).toBe('d-1');
  });

  it('sin elección previa devuelve la principal', () => {
    expect(resolverUbicacion(null, [surco, miraflores])?.direccionId).toBe('d-1');
  });
});

describe('filtrarDirecciones', () => {
  const lista = [miraflores, surco, callao];

  it('devuelve todo con término vacío', () => {
    expect(filtrarDirecciones(lista, '   ')).toHaveLength(3);
  });

  it('filtra por distrito sin distinguir acentos ni mayúsculas', () => {
    expect(filtrarDirecciones(lista, 'SURCO').map((d) => d.id)).toEqual(['d-2']);
    expect(filtrarDirecciones(lista, 'bellav')).toHaveLength(1);
  });

  it('filtra por provincia', () => {
    expect(filtrarDirecciones(lista, 'callao').map((d) => d.id)).toEqual(['d-3']);
  });

  it('filtra por línea de dirección y referencia', () => {
    expect(filtrarDirecciones(lista, 'Benavides').map((d) => d.id)).toEqual(['d-2']);
    const conRef = { ...surco, referencia: 'Frente al parque' };
    expect(filtrarDirecciones([conRef], 'parque')).toHaveLength(1);
  });

  it('devuelve lista vacía si nada coincide', () => {
    expect(filtrarDirecciones(lista, 'Trujillo')).toEqual([]);
  });
});
