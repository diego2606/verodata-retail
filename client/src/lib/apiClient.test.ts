import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiClientError } from './apiClient';

const TOKEN_KEY = 'verodata_token';

/** Respuesta de fetch mínima: solo se usa `status` y `json()`. */
function respuestaJson(payload: unknown, status = 200): Response {
  return { status, json: () => Promise.resolve(payload) } as unknown as Response;
}

const exito = { success: true, message: 'ok', data: null };
const fetchMock = vi.fn();

function initDeLaLlamada(indice = 0): RequestInit {
  return fetchMock.mock.calls[indice][1] as RequestInit;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiClient', () => {
  it('devuelve el envelope tipado de la API', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({ success: true, message: 'ok', data: { id: 'p1' } })
    );

    const res = await apiClient.get<{ id: string }>('/api/v1/products/p1');

    expect(res).toEqual({ success: true, message: 'ok', data: { id: 'p1' } });
  });

  it('llama al path indicado con el método HTTP correspondiente', async () => {
    fetchMock.mockResolvedValue(respuestaJson(exito));

    await apiClient.patch('/api/v1/products/p1', { nombre: 'Nuevo' });

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/products\/p1$/);
    expect(initDeLaLlamada().method).toBe('PATCH');
  });

  it('serializa el body a JSON', async () => {
    fetchMock.mockResolvedValue(respuestaJson(exito));

    await apiClient.post('/api/v1/products', { nombre: 'Zapatilla' });

    expect(initDeLaLlamada().body).toBe(JSON.stringify({ nombre: 'Zapatilla' }));
    expect(initDeLaLlamada().headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('no envía body en las peticiones GET', async () => {
    fetchMock.mockResolvedValue(respuestaJson(exito));

    await apiClient.get('/api/v1/status');

    expect(initDeLaLlamada().body).toBeUndefined();
  });

  it('adjunta el token de localStorage como Bearer', async () => {
    localStorage.setItem(TOKEN_KEY, 'token-local');
    fetchMock.mockResolvedValue(respuestaJson(exito));

    await apiClient.get('/api/v1/status');

    expect(initDeLaLlamada().headers).toMatchObject({ Authorization: 'Bearer token-local' });
  });

  it('usa el token de sessionStorage cuando no hay sesión recordada', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token-sesion');
    fetchMock.mockResolvedValue(respuestaJson(exito));

    await apiClient.get('/api/v1/status');

    expect(initDeLaLlamada().headers).toMatchObject({ Authorization: 'Bearer token-sesion' });
  });

  it('no adjunta Authorization cuando no hay token', async () => {
    fetchMock.mockResolvedValue(respuestaJson(exito));

    await apiClient.get('/api/v1/status');

    const headers = initDeLaLlamada().headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('propaga el AbortSignal para poder cancelar la petición', async () => {
    fetchMock.mockResolvedValue(respuestaJson(exito));
    const controller = new AbortController();

    await apiClient.get('/api/v1/status', controller.signal);

    expect(initDeLaLlamada().signal).toBe(controller.signal);
  });

  it('devuelve el fallo de negocio sin lanzar excepción', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson(
        { success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'No existe', details: null } },
        404
      )
    );

    const res = await apiClient.get('/api/v1/products/x');

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('lanza ApiClientError cuando falla la red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/api/v1/status')).rejects.toThrow(ApiClientError);
    await expect(apiClient.get('/api/v1/status')).rejects.toThrow(
      'No se pudo conectar con el servidor'
    );
  });

  it('lanza ApiClientError cuando la respuesta no es JSON', async () => {
    fetchMock.mockResolvedValue({
      status: 502,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as unknown as Response);

    await expect(apiClient.get('/api/v1/status')).rejects.toThrow('Respuesta inválida del servidor');
  });

  it('lanza ApiClientError cuando el JSON no es un envelope de la API', async () => {
    fetchMock.mockResolvedValue(respuestaJson({ hola: 'mundo' }));

    await expect(apiClient.get('/api/v1/status')).rejects.toThrow('Formato de respuesta inesperado');
  });

  it('expone el status HTTP en el error', async () => {
    fetchMock.mockResolvedValue({
      status: 500,
      json: () => Promise.reject(new SyntaxError('boom')),
    } as unknown as Response);

    await expect(apiClient.get('/api/v1/status')).rejects.toMatchObject({ status: 500 });
  });
});
