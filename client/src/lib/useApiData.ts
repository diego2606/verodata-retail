import { useCallback, useEffect, useState } from 'react';
import { apiClient, type ApiResponse } from './apiClient';

export type EstadoApi<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

/**
 * Hook mínimo de carga de datos con los 4 estados del proyecto
 * (loading / error / success). `path = null` mantiene el estado de carga
 * (útil cuando aún no se debe consultar).
 */
export function useApiData<T>(path: string | null): {
  estado: EstadoApi<T>;
  recargar: () => void;
} {
  const [estado, setEstado] = useState<EstadoApi<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    setEstado({ status: 'loading' });

    apiClient
      .get<T>(path, controller.signal)
      .then((res: ApiResponse<T>) => {
        if (res.success) setEstado({ status: 'success', data: res.data });
        else setEstado({ status: 'error', message: res.error.message });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setEstado({
          status: 'error',
          message: error instanceof Error ? error.message : 'No se pudo cargar la información',
        });
      });

    return () => controller.abort();
  }, [path, nonce]);

  const recargar = useCallback(() => setNonce((n) => n + 1), []);
  return { estado, recargar };
}
