import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../services/product-model.service', () => ({
  productModelService: {
    listar: vi.fn(),
    crear: vi.fn(),
    obtener: vi.fn(),
    obtenerPorSku: vi.fn(),
    actualizar: vi.fn(),
    aplicarDelta: vi.fn(),
    listarImagenes: vi.fn(),
    agregarImagen: vi.fn(),
    marcarImagenPrincipal: vi.fn(),
    actualizarImagen: vi.fn(),
    eliminarImagen: vi.fn(),
  },
  mapearErrorUnicidad: vi.fn(),
}));

import { productModelController } from './product-model.controller';
import { mapearErrorUnicidad, productModelService } from '../services/product-model.service';
import {
  AtributoFaltanteError,
  AtributoInvalidoError,
  SkuRequeridoError,
  VarianteAjenaError,
  VarianteDuplicadaError,
} from '../services/product-model.errors';

type Mock = ReturnType<typeof vi.fn>;

const svc = productModelService as unknown as Record<string, Mock>;
const mapear = mapearErrorUnicidad as unknown as Mock;

const MODELO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SKU_ID = '11111111-1111-1111-1111-111111111111';
const IMAGEN_ID = '33333333-3333-3333-3333-333333333333';

const OK = { success: true, message: 'ok', data: {} };

function mockRes(): { res: Response; status: Mock; json: Mock } {
  const status = vi.fn();
  const json = vi.fn();
  const res = { status, json } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json };
}

function mockReq(overrides: { params?: Record<string, string>; body?: unknown } = {}): Request {
  return { params: overrides.params ?? {}, body: overrides.body ?? {} } as unknown as Request;
}

const paramsModelo = { id: MODELO_ID };
const paramsImagen = { id: MODELO_ID, imagenId: IMAGEN_ID };
const bodyModelo = { categoria_id: 1, nombre: 'Runner Pro' };
const bodyImagen = { url: 'https://cdn.verodata.com/a.png' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const fn of Object.values(svc)) fn.mockResolvedValue(OK);
  mapear.mockImplementation(() => {
    throw new Error('no es un error de unicidad');
  });
});

describe('productModelController.listar', () => {
  it('responde 200 con el listado', async () => {
    const { res, status } = mockRes();
    await productModelController.listar(mockReq(), res);
    expect(status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(OK);
  });

  it('responde 500 si el servicio falla', async () => {
    svc.listar.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.listar(mockReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('productModelController.crear', () => {
  it('responde 400 si el body es inválido', async () => {
    const { res, status } = mockRes();
    await productModelController.crear(mockReq({ body: {} }), res);
    expect(status).toHaveBeenCalledWith(400);
    expect(svc.crear).not.toHaveBeenCalled();
  });

  it('responde 404 si la categoría no existe', async () => {
    svc.crear.mockResolvedValue({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'x', details: null } });
    const { res, status } = mockRes();
    await productModelController.crear(mockReq({ body: bodyModelo }), res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('responde 201 al crear', async () => {
    const { res, status } = mockRes();
    await productModelController.crear(mockReq({ body: bodyModelo }), res);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('responde 500 ante un error inesperado', async () => {
    svc.crear.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.crear(mockReq({ body: bodyModelo }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('productModelController.obtener / obtenerPorSku', () => {
  it('responde 400 si el id no es UUID', async () => {
    const { res, status } = mockRes();
    await productModelController.obtener(mockReq({ params: { id: 'nope' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('responde 404 si el modelo no existe', async () => {
    svc.obtener.mockResolvedValue({ success: false, error: { code: 'MODEL_NOT_FOUND', message: 'x', details: null } });
    const { res, status } = mockRes();
    await productModelController.obtener(mockReq({ params: paramsModelo }), res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('responde 200 con la ficha del modelo', async () => {
    const { res, status } = mockRes();
    await productModelController.obtener(mockReq({ params: paramsModelo }), res);
    expect(status).toHaveBeenCalledWith(200);
    expect(svc.obtener).toHaveBeenCalledWith(MODELO_ID);
  });

  it('responde 500 si obtener falla', async () => {
    svc.obtener.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.obtener(mockReq({ params: paramsModelo }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('resuelve la ficha desde el SKU (200) y valida el parámetro (400)', async () => {
    const ok = mockRes();
    await productModelController.obtenerPorSku(mockReq({ params: { skuId: SKU_ID } }), ok.res);
    expect(svc.obtenerPorSku).toHaveBeenCalledWith(SKU_ID);
    expect(ok.status).toHaveBeenCalledWith(200);

    const invalido = mockRes();
    await productModelController.obtenerPorSku(mockReq({ params: { skuId: 'nope' } }), invalido.res);
    expect(invalido.status).toHaveBeenCalledWith(400);
  });

  it('responde 500 si obtenerPorSku falla', async () => {
    svc.obtenerPorSku.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.obtenerPorSku(mockReq({ params: { skuId: SKU_ID } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('productModelController.actualizar', () => {
  it('responde 400 si el body viene vacío', async () => {
    const { res, status } = mockRes();
    await productModelController.actualizar(mockReq({ params: paramsModelo, body: {} }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('responde 200 al actualizar', async () => {
    const { res, status } = mockRes();
    await productModelController.actualizar(mockReq({ params: paramsModelo, body: { activo: false } }), res);
    expect(status).toHaveBeenCalledWith(200);
  });

  it('responde 500 si el servicio falla', async () => {
    svc.actualizar.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.actualizar(mockReq({ params: paramsModelo, body: { activo: false } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('productModelController.aplicarDelta', () => {
  it('responde 400 si el id o el body son inválidos', async () => {
    const malId = mockRes();
    await productModelController.aplicarDelta(mockReq({ params: { id: 'nope' }, body: {} }), malId.res);
    expect(malId.status).toHaveBeenCalledWith(400);

    const malBody = mockRes();
    await productModelController.aplicarDelta(
      mockReq({ params: paramsModelo, body: { eliminar_variantes: ['x'] } }),
      malBody.res
    );
    expect(malBody.status).toHaveBeenCalledWith(400);
  });

  it('responde 200 con el resumen del delta', async () => {
    const { res, status } = mockRes();
    await productModelController.aplicarDelta(mockReq({ params: paramsModelo, body: {} }), res);
    expect(status).toHaveBeenCalledWith(200);
  });

  it('traduce los fallos de negocio del servicio (404 / 409 / 400)', async () => {
    const casos: Array<[string, number]> = [
      ['MODEL_NOT_FOUND', 404],
      ['SKU_ALREADY_EXISTS', 409],
      ['VARIANT_ALREADY_EXISTS', 400],
    ];
    for (const [code, esperado] of casos) {
      svc.aplicarDelta.mockResolvedValue({ success: false, error: { code, message: 'x', details: null } });
      const { res, status } = mockRes();
      await productModelController.aplicarDelta(mockReq({ params: paramsModelo, body: {} }), res);
      expect(status).toHaveBeenCalledWith(esperado);
    }
  });

  it('mapea los errores de dominio a 400 controlados', async () => {
    const errores = [
      [new VarianteDuplicadaError({ COLOR: 'Negro' }), 'VARIANT_ALREADY_EXISTS'],
      [new AtributoInvalidoError(['RAM'], ['COLOR']), 'INVALID_ATTRIBUTE'],
      [new AtributoFaltanteError(['SIZE']), 'MISSING_REQUIRED_ATTRIBUTE'],
      [new SkuRequeridoError(), 'SKU_REQUIRED'],
      [new VarianteAjenaError(SKU_ID), 'VARIANT_NOT_FOUND'],
    ] as const;
    for (const [error, code] of errores) {
      svc.aplicarDelta.mockRejectedValue(error);
      const { res, status, json } = mockRes();
      await productModelController.aplicarDelta(mockReq({ params: paramsModelo, body: {} }), res);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code }) }));
    }
  });

  it('usa mapearErrorUnicidad para las violaciones de la base de datos', async () => {
    svc.aplicarDelta.mockRejectedValue({ code: '23505', constraint: 'productos_sku_key' });
    mapear.mockReturnValue({ success: false, error: { code: 'SKU_ALREADY_EXISTS', message: 'x', details: null } });
    const { res, status } = mockRes();
    await productModelController.aplicarDelta(mockReq({ params: paramsModelo, body: {} }), res);
    expect(status).toHaveBeenCalledWith(409);
  });

  it('responde 500 si el error no es de unicidad ni de dominio', async () => {
    svc.aplicarDelta.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.aplicarDelta(mockReq({ params: paramsModelo, body: {} }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

describe('productModelController galería (HU033/HU035)', () => {
  it('lista las imágenes del modelo (200) y valida el id (400)', async () => {
    const ok = mockRes();
    await productModelController.listarImagenes(mockReq({ params: paramsModelo }), ok.res);
    expect(ok.status).toHaveBeenCalledWith(200);

    const malo = mockRes();
    await productModelController.listarImagenes(mockReq({ params: { id: 'nope' } }), malo.res);
    expect(malo.status).toHaveBeenCalledWith(400);
  });

  it('responde 500 si listarImagenes falla', async () => {
    svc.listarImagenes.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.listarImagenes(mockReq({ params: paramsModelo }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('agrega una imagen (201), valida el body (400) y refleja el 404', async () => {
    const ok = mockRes();
    await productModelController.agregarImagen(mockReq({ params: paramsModelo, body: bodyImagen }), ok.res);
    expect(ok.status).toHaveBeenCalledWith(201);

    const sinDatos = mockRes();
    await productModelController.agregarImagen(mockReq({ params: paramsModelo, body: {} }), sinDatos.res);
    expect(sinDatos.status).toHaveBeenCalledWith(400);

    svc.agregarImagen.mockResolvedValue({ success: false, error: { code: 'MODEL_NOT_FOUND', message: 'x', details: null } });
    const noExiste = mockRes();
    await productModelController.agregarImagen(mockReq({ params: paramsModelo, body: bodyImagen }), noExiste.res);
    expect(noExiste.status).toHaveBeenCalledWith(404);
  });

  it('responde 500 si agregarImagen falla', async () => {
    svc.agregarImagen.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.agregarImagen(mockReq({ params: paramsModelo, body: bodyImagen }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('marca la imagen principal (200) y valida los parámetros (400)', async () => {
    const ok = mockRes();
    await productModelController.marcarImagenPrincipal(mockReq({ params: paramsImagen }), ok.res);
    expect(svc.marcarImagenPrincipal).toHaveBeenCalledWith(MODELO_ID, IMAGEN_ID);
    expect(ok.status).toHaveBeenCalledWith(200);

    const malo = mockRes();
    await productModelController.marcarImagenPrincipal(mockReq({ params: { id: MODELO_ID, imagenId: 'nope' } }), malo.res);
    expect(malo.status).toHaveBeenCalledWith(400);
  });

  it('responde 500 si marcarImagenPrincipal falla', async () => {
    svc.marcarImagenPrincipal.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.marcarImagenPrincipal(mockReq({ params: paramsImagen }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('actualiza una imagen (200) y valida el body (400)', async () => {
    const ok = mockRes();
    await productModelController.actualizarImagen(mockReq({ params: paramsImagen, body: { alt: 'vista' } }), ok.res);
    expect(ok.status).toHaveBeenCalledWith(200);

    const malo = mockRes();
    await productModelController.actualizarImagen(mockReq({ params: paramsImagen, body: {} }), malo.res);
    expect(malo.status).toHaveBeenCalledWith(400);
  });

  it('responde 500 si actualizarImagen falla', async () => {
    svc.actualizarImagen.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.actualizarImagen(mockReq({ params: paramsImagen, body: { alt: 'x' } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('elimina una imagen (200) y refleja el 404', async () => {
    const ok = mockRes();
    await productModelController.eliminarImagen(mockReq({ params: paramsImagen }), ok.res);
    expect(ok.status).toHaveBeenCalledWith(200);

    svc.eliminarImagen.mockResolvedValue({ success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'x', details: null } });
    const noExiste = mockRes();
    await productModelController.eliminarImagen(mockReq({ params: paramsImagen }), noExiste.res);
    expect(noExiste.status).toHaveBeenCalledWith(404);
  });

  it('responde 500 si eliminarImagen falla', async () => {
    svc.eliminarImagen.mockRejectedValue(new Error('boom'));
    const { res, status } = mockRes();
    await productModelController.eliminarImagen(mockReq({ params: paramsImagen }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});
