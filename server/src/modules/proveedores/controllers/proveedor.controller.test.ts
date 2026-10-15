import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../services/proveedor.service', () => ({
  proveedorService: {
    listar: vi.fn(),
    crear: vi.fn(),
  },
}));

import { proveedorController } from './proveedor.controller';
import { proveedorService } from '../services/proveedor.service';

type Mock = ReturnType<typeof vi.fn>;
const svc = proveedorService as unknown as Record<string, Mock>;

const OK = { success: true, message: 'ok', data: [] };

function mockRes(): { res: Response; status: Mock; json: Mock } {
  const status = vi.fn();
  const json = vi.fn();
  const res = { status, json } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json };
}

function mockReq(overrides: { body?: unknown; query?: unknown } = {}): Request {
  return { body: overrides.body ?? {}, query: overrides.query ?? {} } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const fn of Object.values(svc)) fn.mockResolvedValue(OK);
});

describe('proveedorController.listar', () => {
  it('responde 200 con el listado', async () => {
    const { res, status } = mockRes();
    await proveedorController.listar(mockReq({ query: { search: 'andina' } }), res);
    expect(status).toHaveBeenCalledWith(200);
    expect(svc.listar).toHaveBeenCalledWith({ search: 'andina' });
  });

  it('responde 400 si el query es inválido y 500 ante un error', async () => {
    const malo = mockRes();
    await proveedorController.listar(mockReq({ query: { search: '' } }), malo.res);
    expect(malo.status).toHaveBeenCalledWith(400);

    svc.listar.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await proveedorController.listar(mockReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('proveedorController.crear', () => {
  it('responde 400 si el body es inválido', async () => {
    const { res, status } = mockRes();
    await proveedorController.crear(mockReq({ body: { nombre_empresa: 'A' } }), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(svc.crear).not.toHaveBeenCalled();
  });

  it('responde 201 al crear', async () => {
    const { res, status } = mockRes();
    await proveedorController.crear(mockReq({ body: { nombre_empresa: 'Acme SAC' } }), res);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('responde 409 si el proveedor ya existe', async () => {
    svc.crear.mockResolvedValue({ success: false, error: { code: 'PROVEEDOR_ALREADY_EXISTS', message: 'x', details: null } });
    const { res, status } = mockRes();
    await proveedorController.crear(mockReq({ body: { nombre_empresa: 'Acme SAC' } }), res);
    expect(status).toHaveBeenCalledWith(409);
  });

  it('responde 500 si el servicio falla', async () => {
    svc.crear.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await proveedorController.crear(mockReq({ body: { nombre_empresa: 'Acme SAC' } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});
