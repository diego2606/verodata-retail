import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/color.repository', () => ({
  colorRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    existeNombre: vi.fn(),
    existeSlug: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
  },
}));

import { colorService } from './color.service';
import { colorRepository } from '../repositories/color.repository';
import type { ColorRow } from '../repositories/color.repository';

const repo = colorRepository as unknown as {
  listar: ReturnType<typeof vi.fn>;
  obtenerPorId: ReturnType<typeof vi.fn>;
  existeNombre: ReturnType<typeof vi.fn>;
  existeSlug: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
};

const row: ColorRow = {
  id: 1,
  nombre: 'Negro',
  slug: 'negro',
  hex: '#000000',
  activo: true,
  creado_en: new Date(),
};

describe('colorService (HU032)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeNombre.mockResolvedValue(false);
    repo.existeSlug.mockResolvedValue(false);
    repo.crear.mockResolvedValue(1);
    repo.obtenerPorId.mockResolvedValue(row);
  });

  it('crea un color generando el slug', async () => {
    const result = await colorService.crear({ nombre: 'Negro', hex: '#000000' });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith({ nombre: 'Negro', slug: 'negro', hex: '#000000' });
  });

  it('rechaza nombre duplicado', async () => {
    repo.existeNombre.mockResolvedValue(true);
    const result = await colorService.crear({ nombre: 'Negro', hex: '#000000' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NAME_ALREADY_EXISTS');
  });

  it('devuelve RESOURCE_NOT_FOUND al actualizar inexistente', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await colorService.actualizar(99, { activo: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
