import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../services/reposicion.service', () => ({
  reposicionService: {
    listar: vi.fn(),
    obtener: vi.fn(),
    crear: vi.fn(),
    recibir: vi.fn(),
    cancelar: vi.fn(),
  },
}));

import { reposicionController } from './reposicion.controller';
import { reposicionService } from '../services/reposicion.service';

type Mock = ReturnType<typeof vi.fn>;
const svc = reposicionService as unknown as Record<string, Mock>;

const ORDEN_ID = '33333333-3333-3333-3333-333333333333';
const PROVEEDOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SKU_A = '11111111-1111-1111-1111-111111111111';

const OK = { success: true, message: 'ok', data: {} };

function mockRes(): { res: Response; status: Mock; json: Mock } {
  const status = vi.fn();
  const json = vi.fn();
  const res = { status, json } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json };
}

function mockReq(overrides: { params?: Record<string, string>; body?: unknown; query?: unknown; user?: unknown } = {}): Request {
  return {
    params: overrides.params ?? {},
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    user: overrides.user,
  } as unknown as Request;
}

const bodyValido = {
  proveedor_id: PROVEEDOR_ID,
  detalles: [{ producto_id: SKU_A, costo_unitario: 10, cantidad_pedida: 2 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const fn of Object.values(svc)) fn.mockResolvedValue(OK);
});

describe('reposicionController.listar', () => {
  it('responde 200 con el historial paginado', async () => {
    const { res, status } = mockRes();
    await reposicionController.listar(mockReq({ query: { page: '1' } }), res);
    expect(status).toHaveBeenCalledWith(200);
    expect(svc.listar).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('responde 400 si el query es inválido', async () => {
    const { res, status } = mockRes();
    await reposicionController.listar(mockReq({ query: { estado: 'ENTREGADO' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('responde 500 si el servicio falla', async () => {
    svc.listar.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await reposicionController.listar(mockReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('reposicionController.obtener', () => {
  it('valida el id (400) y devuelve 200', async () => {
    const malo = mockRes();
    await reposicionController.obtener(mockReq({ params: { id: 'nope' } }), malo.res);
    expect(malo.status).toHaveBeenCalledWith(400);

    const ok = mockRes();
    await reposicionController.obtener(mockReq({ params: { id: ORDEN_ID } }), ok.res);
    expect(ok.status).toHaveBeenCalledWith(200);
  });

  it('responde 404 si no existe', async () => {
    svc.obtener.mockResolvedValue({ success: false, error: { code: 'ORDEN_NOT_FOUND', message: 'x', details: null } });
    const { res, status } = mockRes();
    await reposicionController.obtener(mockReq({ params: { id: ORDEN_ID } }), res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('responde 500 si el servicio falla', async () => {
    svc.obtener.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await reposicionController.obtener(mockReq({ params: { id: ORDEN_ID } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('reposicionController.crear', () => {
  it('responde 400 si el body es inválido', async () => {
    const { res, status } = mockRes();
    await reposicionController.crear(mockReq({ body: { proveedor_id: PROVEEDOR_ID, detalles: [] } }), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(svc.crear).not.toHaveBeenCalled();
  });

  it('responde 201 y propaga el usuario autenticado', async () => {
    const { res, status } = mockRes();
    await reposicionController.crear(
      mockReq({ body: bodyValido, user: { id_usuario: 'u1' } }),
      res
    );
    expect(status).toHaveBeenCalledWith(201);
    expect(svc.crear).toHaveBeenCalledWith(expect.objectContaining({ proveedor_id: PROVEEDOR_ID }), 'u1');
  });

  it('traduce los fallos de negocio (404 / 409 / 400)', async () => {
    const casos: Array<[string, number]> = [
      ['PROVEEDOR_NOT_FOUND', 404],
      ['PRODUCTO_NOT_FOUND', 404],
      ['PRODUCTO_SIN_INVENTARIO', 409],
      ['VALIDATION_ERROR', 400],
    ];
    for (const [code, esperado] of casos) {
      svc.crear.mockResolvedValue({ success: false, error: { code, message: 'x', details: null } });
      const { res, status } = mockRes();
      await reposicionController.crear(mockReq({ body: bodyValido }), res);
      expect(status).toHaveBeenCalledWith(esperado);
    }
  });

  it('responde 500 si el servicio falla', async () => {
    svc.crear.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await reposicionController.crear(mockReq({ body: bodyValido }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('reposicionController.recibir', () => {
  it('responde 200 al confirmar la recepción', async () => {
    const { res, status } = mockRes();
    await reposicionController.recibir(mockReq({ params: { id: ORDEN_ID }, user: { id_usuario: 'u1' } }), res);
    expect(status).toHaveBeenCalledWith(200);
    expect(svc.recibir).toHaveBeenCalledWith(ORDEN_ID, 'u1');
  });

  it('responde 409 si la orden ya no está PENDIENTE', async () => {
    svc.recibir.mockResolvedValue({ success: false, error: { code: 'ORDEN_NO_PENDIENTE', message: 'x', details: null } });
    const { res, status } = mockRes();
    await reposicionController.recibir(mockReq({ params: { id: ORDEN_ID } }), res);
    expect(status).toHaveBeenCalledWith(409);
  });

  it('valida el id (400) y responde 500 ante un error inesperado', async () => {
    const malo = mockRes();
    await reposicionController.recibir(mockReq({ params: { id: 'nope' } }), malo.res);
    expect(malo.status).toHaveBeenCalledWith(400);

    svc.recibir.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await reposicionController.recibir(mockReq({ params: { id: ORDEN_ID } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('reposicionController.cancelar', () => {
  it('responde 200 con el motivo opcional', async () => {
    const { res, status } = mockRes();
    await reposicionController.cancelar(mockReq({ params: { id: ORDEN_ID }, body: { motivo: 'sin stock' } }), res);
    expect(status).toHaveBeenCalledWith(200);
    expect(svc.cancelar).toHaveBeenCalledWith(ORDEN_ID, { motivo: 'sin stock' });
  });

  it('acepta un body vacío (motivo opcional)', async () => {
    const { res, status } = mockRes();
    await reposicionController.cancelar(mockReq({ params: { id: ORDEN_ID }, body: undefined }), res);
    expect(status).toHaveBeenCalledWith(200);
  });

  it('responde 409 si ya no está PENDIENTE y 500 ante un error', async () => {
    svc.cancelar.mockResolvedValue({ success: false, error: { code: 'ORDEN_NO_PENDIENTE', message: 'x', details: null } });
    const conflicto = mockRes();
    await reposicionController.cancelar(mockReq({ params: { id: ORDEN_ID } }), conflicto.res);
    expect(conflicto.status).toHaveBeenCalledWith(409);

    svc.cancelar.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await reposicionController.cancelar(mockReq({ params: { id: ORDEN_ID } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});
