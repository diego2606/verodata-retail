import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/direccion.repository', () => ({
  direccionRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    marcarPrincipal: vi.fn(),
    eliminar: vi.fn(),
  },
}));

import { direccionService } from './direccion.service';
import { direccionRepository } from '../repositories/direccion.repository';
import type { DireccionRow } from '../repositories/direccion.repository';

const repo = direccionRepository as unknown as {
  listar: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
  marcarPrincipal: ReturnType<typeof vi.fn>;
  eliminar: ReturnType<typeof vi.fn>;
};

const row: DireccionRow = {
  id: '11111111-1111-4111-8111-111111111111',
  usuario_id: '22222222-2222-4222-8222-222222222222',
  departamento: 'Lima',
  provincia: 'Lima',
  distrito: 'Miraflores',
  direccion_linea: 'Av. Larco 123',
  referencia: null,
  codigo_postal: null,
  latitud: -12.1219,
  longitud: -77.0297,
  es_principal: true,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

const USUARIO = row.usuario_id;

describe('direccionService (HU017)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista las direcciones del usuario', async () => {
    repo.listar.mockResolvedValue([row]);
    const result = await direccionService.listar(USUARIO);
    expect(result.success).toBe(true);
    expect(repo.listar).toHaveBeenCalledWith(USUARIO);
    if (result.success) expect(result.data).toEqual([row]);
  });

  it('crea una dirección propagando las coordenadas del mapa', async () => {
    repo.crear.mockResolvedValue(row);
    const input = {
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      direccion_linea: 'Av. Larco 123',
      latitud: -12.1219,
      longitud: -77.0297,
    };
    const result = await direccionService.crear(USUARIO, input);
    expect(repo.crear).toHaveBeenCalledWith(USUARIO, input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.latitud).toBe(-12.1219);
  });

  it('actualiza una dirección existente', async () => {
    repo.actualizar.mockResolvedValue(row);
    const result = await direccionService.actualizar(USUARIO, row.id, { latitud: -12.12, longitud: -77.03 });
    expect(repo.actualizar).toHaveBeenCalledWith(row.id, USUARIO, { latitud: -12.12, longitud: -77.03 });
    expect(result.success).toBe(true);
  });

  it('devuelve RESOURCE_NOT_FOUND al actualizar una dirección inexistente', async () => {
    repo.actualizar.mockResolvedValue(null);
    const result = await direccionService.actualizar(USUARIO, 'no-existe', { distrito: 'Surco' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('marca una dirección como principal', async () => {
    repo.marcarPrincipal.mockResolvedValue(true);
    const result = await direccionService.marcarPrincipal(USUARIO, row.id);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ id: row.id });
  });

  it('devuelve RESOURCE_NOT_FOUND si la dirección a marcar no existe', async () => {
    repo.marcarPrincipal.mockResolvedValue(false);
    const result = await direccionService.marcarPrincipal(USUARIO, 'no-existe');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('elimina una dirección', async () => {
    repo.eliminar.mockResolvedValue(true);
    const result = await direccionService.eliminar(USUARIO, row.id);
    expect(result.success).toBe(true);
  });

  it('devuelve RESOURCE_NOT_FOUND si la dirección a eliminar no existe', async () => {
    repo.eliminar.mockResolvedValue(false);
    const result = await direccionService.eliminar(USUARIO, 'no-existe');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
