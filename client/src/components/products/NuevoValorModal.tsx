import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ApiClientError } from '../../lib/apiClient';
import { atributosApi } from '../../lib/atributosApi';
import type { TipoAtributo } from '../../types/atributo.types';

interface NuevoValorModalProps {
  atributoId: number;
  atributoNombre: string;
  tipo: TipoAtributo;
  onClose: () => void;
  /** Se llama con el valor creado para seleccionarlo en el formulario. */
  onCreated: (valor: string) => void;
}

/** Modal rápido para crear un valor del maestro sin salir del formulario de producto (CA4). */
export function NuevoValorModal({
  atributoId,
  atributoNombre,
  tipo,
  onClose,
  onCreated,
}: NuevoValorModalProps): React.ReactElement {
  const [nombre, setNombre] = useState('');
  const [hex, setHex] = useState('#000000');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const esColor = tipo === 'COLOR';
  const hexValido = !esColor || /^#[0-9a-fA-F]{6}$/.test(hex);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (nombre.trim().length < 1 || !hexValido) return;
    setIsSubmitting(true);
    try {
      const json = await atributosApi.crearValor(atributoId, {
        valor: nombre.trim(),
        hex: esColor ? hex.toUpperCase() : null,
      });
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      onCreated(nombre.trim());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al crear el valor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="nuevo-valor-titulo" panelClassName="max-w-sm">
      <div className="mb-lg flex items-center justify-between">
        <h2 id="nuevo-valor-titulo" className="text-sm font-medium text-ink">
          Nuevo valor · {atributoNombre}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="mb-md rounded-xs border border-retail-red/20 bg-retail-red/5 p-sm text-xs text-ink-secondary">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        <div>
          <label htmlFor="nuevo-valor" className="mb-xs block text-xs font-medium text-ink">Valor</label>
          <Input id="nuevo-valor" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Verde Menta" autoFocus />
        </div>

        {esColor && (
          <div>
            <label htmlFor="nuevo-valor-hex" className="mb-xs block text-xs font-medium text-ink">Hex</label>
            <div className="flex items-center gap-sm">
              <span className="h-9 w-9 shrink-0 rounded-sm border border-hairline" style={{ backgroundColor: hexValido ? hex : 'transparent' }} aria-hidden="true" />
              <Input id="nuevo-valor-hex" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} maxLength={7} invalid={!hexValido} className="font-mono uppercase" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting} disabled={nombre.trim().length < 1 || !hexValido}>
            {isSubmitting ? 'Creando…' : 'Crear y usar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default NuevoValorModal;
