import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { apiClient, ApiClientError } from '../../lib/apiClient';
import type { AgregarImagenPayload, ProductoImagen } from '../../types/product.types';

interface ProductImagesGalleryProps {
  productoId: string;
  /** Notifica cambios para que el producto recargue su portada si hace falta. */
  onChanged?: () => void;
}

/** HU033: gestión de la galería (principal + vistas) de un producto. */
export function ProductImagesGallery({
  productoId,
  onChanged,
}: ProductImagesGalleryProps): React.ReactElement {
  const [imagenes, setImagenes] = useState<ProductoImagen[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    apiClient
      .get<ProductoImagen[]>(`/api/v1/products/${productoId}/images`)
      .then(json => {
        if (!active) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setImagenes(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [productoId, reloadKey]);

  const reload = useCallback((): void => {
    setReloadKey(k => k + 1);
    onChanged?.();
  }, [onChanged]);

  const agregar = useCallback(
    async (payload: AgregarImagenPayload): Promise<void> => {
      setError(null);
      setIsAdding(true);
      try {
        const json = await apiClient.post<ProductoImagen>(
          `/api/v1/products/${productoId}/images`,
          payload
        );
        if (!json.success) {
          setError(json.error.message);
          return;
        }
        setUrl('');
        reload();
      } catch (e) {
        setError(e instanceof ApiClientError ? e.message : 'Error al agregar la imagen');
      } finally {
        setIsAdding(false);
      }
    },
    [productoId, reload]
  );

  const onArchivo = useCallback(
    (file: File): void => {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen supera 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const data = typeof reader.result === 'string' ? reader.result : '';
        if (data) void agregar({ data, alt: file.name });
      };
      reader.readAsDataURL(file);
    },
    [agregar]
  );

  const marcarPrincipal = useCallback(
    async (imagenId: string): Promise<void> => {
      setBusyId(imagenId);
      setError(null);
      try {
        const json = await apiClient.patch(`/api/v1/products/${productoId}/images/${imagenId}/principal`, {});
        if (!json.success) {
          setError(json.error.message);
          return;
        }
        reload();
      } catch (e) {
        setError(e instanceof ApiClientError ? e.message : 'Error al marcar principal');
      } finally {
        setBusyId(null);
      }
    },
    [productoId, reload]
  );

  const eliminar = useCallback(
    async (imagenId: string): Promise<void> => {
      setBusyId(imagenId);
      setError(null);
      try {
        const json = await apiClient.delete(`/api/v1/products/${productoId}/images/${imagenId}`);
        if (!json.success) {
          setError(json.error.message);
          return;
        }
        reload();
      } catch (e) {
        setError(e instanceof ApiClientError ? e.message : 'Error al eliminar la imagen');
      } finally {
        setBusyId(null);
      }
    },
    [productoId, reload]
  );

  const mover = useCallback(
    async (indice: number, delta: number): Promise<void> => {
      const destino = indice + delta;
      if (destino < 0 || destino >= imagenes.length) return;
      const a = imagenes[indice];
      const b = imagenes[destino];
      setError(null);
      try {
        await apiClient.patch(`/api/v1/products/${productoId}/images/${a.id}`, { orden: b.orden });
        await apiClient.patch(`/api/v1/products/${productoId}/images/${b.id}`, { orden: a.orden });
        reload();
      } catch (e) {
        setError(e instanceof ApiClientError ? e.message : 'Error al reordenar');
      }
    },
    [imagenes, productoId, reload]
  );

  return (
    <div className="space-y-sm">
      {error && (
        <p role="alert" aria-live="polite" className="text-xs text-retail-red">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-sm">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="imagen-url" className="mb-xs block text-xs font-medium text-ink">
            Agregar por URL
          </label>
          <Input
            id="imagen-url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          isLoading={isAdding && url.trim() !== ''}
          disabled={!url.trim()}
          onClick={() => void agregar({ url: url.trim() })}
        >
          <ImagePlus size={13} aria-hidden="true" />
          Agregar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onArchivo(file);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="secondary"
          isLoading={isAdding}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={13} aria-hidden="true" />
          Subir archivo
        </Button>
      </div>

      {status === 'loading' && (
        <div className="grid grid-cols-4 gap-sm" aria-busy="true" aria-label="Cargando imágenes">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xs bg-hairline-cool" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm">
          <p className="text-xs text-ink-secondary">No se pudieron cargar las imágenes.</p>
          <Button type="button" variant="secondary" size="sm" onClick={reload}>
            Reintentar
          </Button>
        </div>
      )}

      {status === 'ready' && imagenes.length === 0 && (
        <p className="rounded-xs border border-dashed border-hairline-strong px-sm py-md text-center text-xs text-ink-mute">
          Sin imágenes. Agrega una por URL o sube un archivo.
        </p>
      )}

      {status === 'ready' && imagenes.length > 0 && (
        <ul className="grid grid-cols-2 gap-sm sm:grid-cols-4" role="list">
          {imagenes.map((img, i) => (
            <li
              key={img.id}
              className={cn(
                'group relative overflow-hidden rounded-xs border bg-canvas-soft',
                img.es_principal ? 'border-primary' : 'border-hairline'
              )}
            >
              <img src={img.url} alt={img.alt ?? ''} loading="lazy" className="aspect-square w-full object-cover" />
              {img.es_principal && (
                <span className="absolute left-xs top-xs rounded-xs bg-primary px-xs py-xxs text-[10px] font-medium leading-none text-on-primary">
                  Principal
                </span>
              )}
              <div className="flex items-center justify-between gap-xs border-t border-hairline bg-canvas p-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Marcar como principal"
                  title="Marcar como principal"
                  disabled={img.es_principal || busyId === img.id}
                  onClick={() => void marcarPrincipal(img.id)}
                >
                  <Star size={13} aria-hidden="true" className={img.es_principal ? 'text-primary-ink' : undefined} />
                </Button>
                <div className="flex items-center gap-xxs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Mover antes"
                    disabled={i === 0}
                    onClick={() => void mover(i, -1)}
                  >
                    <ArrowUp size={13} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Mover después"
                    disabled={i === imagenes.length - 1}
                    onClick={() => void mover(i, 1)}
                  >
                    <ArrowDown size={13} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar imagen"
                    className="text-retail-red hover:bg-retail-red/10"
                    disabled={busyId === img.id}
                    onClick={() => void eliminar(img.id)}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProductImagesGallery;
