import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useApiData } from './useApiData';

const fetchMock = vi.fn();

function respuestaJson(payload: unknown): Response {
  return { status: 200, json: () => Promise.resolve(payload) } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useApiData', () => {
  it('arranca en estado de carga', () => {
    fetchMock.mockResolvedValue(respuestaJson({ success: true, message: 'ok', data: [] }));

    const { result } = renderHook(() => useApiData<number[]>('/api/v1/colors'));

    expect(result.current.estado.status).toBe('loading');
  });

  it('no consulta la API mientras el path es null', () => {
    const { result } = renderHook(() => useApiData<number[]>(null));

    expect(result.current.estado.status).toBe('loading');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('expone los datos en caso de éxito', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({ success: true, message: 'ok', data: [{ id: 1 }, { id: 2 }] })
    );

    const { result } = renderHook(() => useApiData<Array<{ id: number }>>('/api/v1/colors'));

    await waitFor(() => expect(result.current.estado.status).toBe('success'));
    const estado = result.current.estado;
    if (estado.status === 'success') expect(estado.data).toHaveLength(2);
  });

  it('expone el mensaje de negocio cuando success es false', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No autorizado', details: null },
      })
    );

    const { result } = renderHook(() => useApiData<unknown>('/api/v1/users'));

    await waitFor(() => expect(result.current.estado.status).toBe('error'));
    const estado = result.current.estado;
    if (estado.status === 'error') expect(estado.message).toBe('No autorizado');
  });

  it('expone el error de red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useApiData<unknown>('/api/v1/users'));

    await waitFor(() => expect(result.current.estado.status).toBe('error'));
    const estado = result.current.estado;
    if (estado.status === 'error') expect(estado.message).toBe('No se pudo conectar con el servidor');
  });

  it('vuelve a consultar al llamar a recargar()', async () => {
    fetchMock.mockResolvedValue(respuestaJson({ success: true, message: 'ok', data: [] }));

    const { result } = renderHook(() => useApiData<unknown[]>('/api/v1/colors'));
    await waitFor(() => expect(result.current.estado.status).toBe('success'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => result.current.recargar());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('ignora el aborto al desmontar (no deja el estado en error)', async () => {
    const abortado = Object.assign(new Error('abortado'), { name: 'AbortError' });
    fetchMock.mockRejectedValue(abortado);

    const { result, unmount } = renderHook(() => useApiData<unknown>('/api/v1/users'));
    unmount();

    expect(result.current.estado.status).toBe('loading');
  });
});
