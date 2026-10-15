import { describe, expect, it } from 'vitest';
import { estaVigente } from './banner.service';

const AHORA = new Date('2026-10-14T12:00:00Z');

function banner(parcial: {
  activo?: boolean;
  vigente_desde?: Date | null;
  vigente_hasta?: Date | null;
}): { activo: boolean; vigente_desde: Date | null; vigente_hasta: Date | null } {
  return {
    activo: parcial.activo ?? true,
    vigente_desde: parcial.vigente_desde ?? null,
    vigente_hasta: parcial.vigente_hasta ?? null,
  };
}

describe('estaVigente (HU034 CA05)', () => {
  it('activo sin fechas siempre está vigente', () => {
    expect(estaVigente(banner({}), AHORA)).toBe(true);
  });

  it('inactivo nunca está vigente', () => {
    expect(estaVigente(banner({ activo: false }), AHORA)).toBe(false);
  });

  it('respeta el rango de vigencia', () => {
    expect(
      estaVigente(banner({ vigente_desde: new Date('2026-10-01T00:00:00Z'), vigente_hasta: new Date('2026-10-20T00:00:00Z') }), AHORA)
    ).toBe(true);
    expect(estaVigente(banner({ vigente_desde: new Date('2026-11-01T00:00:00Z') }), AHORA)).toBe(false);
    expect(estaVigente(banner({ vigente_hasta: new Date('2026-10-01T00:00:00Z') }), AHORA)).toBe(false);
  });
});
