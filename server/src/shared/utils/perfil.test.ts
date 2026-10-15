import { describe, expect, it } from 'vitest';
import { perfilCompleto } from './perfil';

describe('perfilCompleto (candado del checkout)', () => {
  it('es completo con tipo y número de documento', () => {
    expect(perfilCompleto({ tipo_documento: 'DNI', numero_documento: '12345678' })).toBe(true);
  });

  it('es incompleto si falta el tipo o el número', () => {
    expect(perfilCompleto({ tipo_documento: null, numero_documento: '12345678' })).toBe(false);
    expect(perfilCompleto({ tipo_documento: 'DNI', numero_documento: null })).toBe(false);
    expect(perfilCompleto({ tipo_documento: null, numero_documento: null })).toBe(false);
  });
});
