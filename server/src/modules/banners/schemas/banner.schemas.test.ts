import { describe, it, expect } from 'vitest';
import { actualizarBannerSchema, crearBannerSchema } from './banner.schemas';

const base = {
  ubicacion: 'HERO' as const,
  titulo: 'Nueva temporada',
  imagen_url: 'https://cdn.verodata.test/hero.jpg',
};

describe('banner.schemas — sobre-título (migración 014)', () => {
  it('acepta un banner con sobre-título', () => {
    const parsed = crearBannerSchema.safeParse({ ...base, etiqueta: 'Temporada' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.etiqueta).toBe('Temporada');
  });

  it('deja el sobre-título como opcional', () => {
    const parsed = crearBannerSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it('normaliza cadena vacía a null', () => {
    const parsed = crearBannerSchema.safeParse({ ...base, etiqueta: '' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.etiqueta).toBeNull();
  });

  it('recorta espacios sobrantes', () => {
    const parsed = crearBannerSchema.safeParse({ ...base, etiqueta: '  Sobre título  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.etiqueta).toBe('Sobre título');
  });

  it('rechaza un sobre-título de más de 80 caracteres', () => {
    const parsed = crearBannerSchema.safeParse({ ...base, etiqueta: 'x'.repeat(81) });
    expect(parsed.success).toBe(false);
  });

  it('permite actualizar solo el sobre-título', () => {
    const parsed = actualizarBannerSchema.safeParse({ etiqueta: 'Otoño' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.etiqueta).toBe('Otoño');
  });

  it('exige al menos un campo al actualizar', () => {
    expect(actualizarBannerSchema.safeParse({}).success).toBe(false);
  });
});
