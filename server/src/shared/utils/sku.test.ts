import { describe, it, expect } from 'vitest';
import { codigoSegmento, generarSkuEstructurado } from './sku';
import {
  ATRIBUTOS_VARIANTE_KEYS,
  SKU_SEGMENTOS,
  SKU_TOKENS_NUMERICOS,
} from '../constants/atributos';

describe('codigoSegmento (HU031)', () => {
  it('usa el prefijo de la categoría acotado a 6', () => {
    expect(codigoSegmento('CATEGORIA', 'Tecnología', {})).toBe('TECNOL');
  });

  it('devuelve vacío cuando no hay valor', () => {
    expect(codigoSegmento('COLOR', null, {})).toBe('');
  });

  it('toma solo los dígitos en las capacidades numéricas (HU036)', () => {
    expect(codigoSegmento('STORAGE_CAPACITY', null, { STORAGE_CAPACITY: '256 GB' })).toBe('256');
    expect(codigoSegmento('CAPACIDAD_LITROS', null, { CAPACIDAD_LITROS: '250 L' })).toBe('250');
    expect(codigoSegmento('CAPACIDAD_KG', null, { CAPACIDAD_KG: '10 kg' })).toBe('10');
    expect(codigoSegmento('CONTENIDO_ML', null, { CONTENIDO_ML: '100 ml' })).toBe('100');
  });

  it('cae al alfanumérico si la capacidad no trae dígitos', () => {
    expect(codigoSegmento('CAPACIDAD_LITROS', null, { CAPACIDAD_LITROS: 'Sin dato' })).toBe('SIN');
  });

  it('acota marca a 2, modelo a 12 y el resto a 3', () => {
    expect(codigoSegmento('BRAND', null, { BRAND: 'Apple' })).toBe('AP');
    expect(codigoSegmento('MODEL', null, { MODEL: '15 Pro Max Ultra' })).toBe('15PROMAXULTR');
    expect(codigoSegmento('TALLA_CALZADO', null, { TALLA_CALZADO: '42' })).toBe('42');
    expect(codigoSegmento('COLOR', null, { COLOR: 'Amarillo' })).toBe('AMA');
  });
});

describe('generarSkuEstructurado (HU031/HU036)', () => {
  it('compone la plantilla con los atributos nuevos', () => {
    expect(
      generarSkuEstructurado(['CATEGORIA', 'COLOR', 'CAPACIDAD_LITROS'], 'REF', {
        COLOR: 'Blanco',
        CAPACIDAD_LITROS: '250 L',
      })
    ).toBe('REF-BLA-250');

    expect(
      generarSkuEstructurado(['CATEGORIA', 'TALLA_CALZADO', 'COLOR'], 'ZAP', {
        TALLA_CALZADO: '42',
        COLOR: 'Negro',
      })
    ).toBe('ZAP-42-NEG');
  });

  it('descarta tokens fuera de la plantilla y omite los vacíos', () => {
    expect(generarSkuEstructurado(['COLOR', 'NO_EXISTE'], null, { COLOR: 'Rojo' })).toBe('ROJ');
    expect(generarSkuEstructurado(['BRAND', 'COLOR'], null, { COLOR: 'Rojo' })).toBe('ROJ');
  });

  it('acota la longitud total a 50 caracteres', () => {
    const sku = generarSkuEstructurado(
      ['CATEGORIA', 'BRAND', 'MODEL', 'CAPACIDAD_LITROS', 'COLOR', 'GENDER'],
      'ELECTRODOMESTICOS',
      {
        BRAND: 'Samsung',
        MODEL: 'Lavadora Avanzada 2026',
        CAPACIDAD_LITROS: '250 L',
        COLOR: 'Blanco',
        GENDER: 'Unisex',
      }
    );
    expect(sku.length).toBeLessThanOrEqual(50);
  });
});

describe('constantes de atributos (HU036)', () => {
  it('los códigos curados son ejes válidos de producto y de plantilla', () => {
    for (const codigo of ['TALLA_CALZADO', 'CAPACIDAD_LITROS', 'CAPACIDAD_KG', 'CONTENIDO_ML']) {
      expect(ATRIBUTOS_VARIANTE_KEYS as readonly string[]).toContain(codigo);
      expect(SKU_SEGMENTOS as readonly string[]).toContain(codigo);
    }
  });

  it('marca como numéricos los tokens de capacidad', () => {
    for (const token of ['STORAGE_CAPACITY', 'CAPACIDAD_LITROS', 'CAPACIDAD_KG', 'CONTENIDO_ML']) {
      expect(SKU_TOKENS_NUMERICOS.has(token)).toBe(true);
    }
    expect(SKU_TOKENS_NUMERICOS.has('COLOR')).toBe(false);
  });
});
