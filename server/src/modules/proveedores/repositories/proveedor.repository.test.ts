import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/db', () => ({
  default: { query: vi.fn() },
}));

import pool from '../../../config/db';
import { proveedorRepository, type ProveedorRow } from './proveedor.repository';

type Mock = ReturnType<typeof vi.fn>;
const poolMock = pool as unknown as { query: Mock };

const PROVEEDOR: ProveedorRow = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  nombre_empresa: 'Distribuidora Andina',
  contacto_nombre: 'Lucía Ramos',
  telefono: '999111222',
  email: 'ventas@andina.pe',
  categoria_productos: 'Calzado',
  activo: true,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  poolMock.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('proveedorRepository', () => {
  it('lista solo los activos ordenados por razón social', async () => {
    poolMock.query.mockResolvedValue({ rows: [PROVEEDOR], rowCount: 1 });
    const filas = await proveedorRepository.listar();
    expect(filas).toEqual([PROVEEDOR]);
    expect(poolMock.query.mock.calls[0][0]).toContain('WHERE activo = TRUE');
  });

  it('filtra por nombre con ILIKE cuando hay búsqueda', async () => {
    poolMock.query.mockResolvedValue({ rows: [PROVEEDOR], rowCount: 1 });
    await proveedorRepository.listar('andina');
    const [sql, valores] = poolMock.query.mock.calls[0];
    expect(sql).toContain('nombre_empresa ILIKE $1');
    expect(valores).toEqual(['%andina%']);
  });

  it('obtiene por id y devuelve null si no existe', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [PROVEEDOR], rowCount: 1 });
    expect(await proveedorRepository.obtenerPorId(PROVEEDOR.id)).toEqual(PROVEEDOR);

    poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await proveedorRepository.obtenerPorId(PROVEEDOR.id)).toBeNull();
  });

  it('detecta el nombre duplicado sin distinguir mayúsculas', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });
    expect(await proveedorRepository.existeNombre('distribuidora andina')).toBe(true);

    poolMock.query.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
    expect(await proveedorRepository.existeNombre('Nueva SAC')).toBe(false);
    expect(poolMock.query.mock.calls[1][0]).toContain('LOWER(nombre_empresa) = LOWER($1)');
  });

  it('crea el proveedor y devuelve la fila insertada', async () => {
    poolMock.query.mockResolvedValue({ rows: [PROVEEDOR], rowCount: 1 });
    const creado = await proveedorRepository.crear({
      nombre_empresa: 'Distribuidora Andina',
      contacto_nombre: 'Lucía Ramos',
      telefono: '999111222',
      email: 'ventas@andina.pe',
      categoria_productos: 'Calzado',
    });
    expect(creado).toEqual(PROVEEDOR);
    expect(poolMock.query.mock.calls[0][1]).toEqual([
      'Distribuidora Andina',
      'Lucía Ramos',
      '999111222',
      'ventas@andina.pe',
      'Calzado',
    ]);
  });
});
