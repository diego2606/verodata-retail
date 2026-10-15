import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/proveedor.repository', () => ({
  proveedorRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    existeNombre: vi.fn(),
    crear: vi.fn(),
  },
}));

import { proveedorService } from './proveedor.service';
import { proveedorRepository, type ProveedorRow } from '../repositories/proveedor.repository';

type Mock = ReturnType<typeof vi.fn>;
const repo = proveedorRepository as unknown as Record<string, Mock>;

const PROVEEDOR: ProveedorRow = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  nombre_empresa: 'Distribuidora Andina',
  contacto_nombre: null,
  telefono: null,
  email: null,
  categoria_productos: null,
  activo: true,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  repo.listar.mockResolvedValue([PROVEEDOR]);
  repo.existeNombre.mockResolvedValue(false);
  repo.crear.mockResolvedValue(PROVEEDOR);
});

describe('proveedorService.listar', () => {
  it('devuelve el listado', async () => {
    const result = await proveedorService.listar({ search: 'andina' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual([PROVEEDOR]);
    expect(repo.listar).toHaveBeenCalledWith('andina');
  });
});

describe('proveedorService.crear', () => {
  it('rechaza el nombre duplicado', async () => {
    repo.existeNombre.mockResolvedValue(true);
    const result = await proveedorService.crear({ nombre_empresa: 'Distribuidora Andina' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('PROVEEDOR_ALREADY_EXISTS');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('normaliza los campos vacíos a null', async () => {
    await proveedorService.crear({
      nombre_empresa: '  Nueva SAC  ',
      contacto_nombre: '   ',
      telefono: ' 999 ',
      email: null,
      categoria_productos: '',
    });
    expect(repo.crear).toHaveBeenCalledWith({
      nombre_empresa: 'Nueva SAC',
      contacto_nombre: null,
      telefono: '999',
      email: null,
      categoria_productos: null,
    });
  });

  it('crea el proveedor y devuelve la fila', async () => {
    const result = await proveedorService.crear({ nombre_empresa: 'Distribuidora Andina' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(PROVEEDOR);
  });
});
