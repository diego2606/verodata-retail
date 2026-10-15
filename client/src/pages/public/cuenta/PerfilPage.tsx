import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Alerta, BOTON_STORE, INPUT_STORE, LABEL_STORE } from '../../../components/storefront/CuentaCard';
import { useAuth } from '../../../context/AuthContext';
import { useApiData } from '../../../lib/useApiData';
import { cuentaApi } from '../../../lib/cuenta';
import { ApiClientError } from '../../../lib/apiClient';
import type {
  ActualizarPerfilPayload,
  DireccionItem,
  DireccionPayload,
  PerfilCliente,
  TipoDocumento,
} from '../../../types/cuenta.types';

const SELECT_STORE =
  'h-9 w-full rounded-md border border-store-line bg-store-surface px-sm text-sm text-store-ink focus:outline-none focus:ring-1 focus:ring-store-accent';

const TIPOS: TipoDocumento[] = ['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA'];

// ─── Datos personales ─────────────────────────────────────────────────────────

function DatosPersonales({ perfil }: { perfil: PerfilCliente }): React.ReactElement {
  const { usuario, actualizarSesion } = useAuth();
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(perfil.tipo_documento ?? 'DNI');
  const [numeroDocumento, setNumeroDocumento] = useState(perfil.numero_documento ?? '');
  const [nombres, setNombres] = useState(perfil.nombres ?? '');
  const [apellidos, setApellidos] = useState(perfil.apellidos ?? '');
  const [telefono, setTelefono] = useState(perfil.telefono ?? '');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setMensaje(null);
    setIsSubmitting(true);
    const payload: ActualizarPerfilPayload = {
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      telefono: telefono.trim() || undefined,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento.trim(),
    };
    try {
      const json = await cuentaApi.actualizarPerfil(payload);
      if (!json.success) {
        setMensaje({ tipo: 'error', texto: json.error.message });
        return;
      }
      setMensaje({ tipo: 'exito', texto: 'Datos actualizados correctamente.' });
      if (usuario) actualizarSesion({ ...usuario, nombre: json.data.nombres });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err instanceof ApiClientError ? err.message : 'Error al guardar' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-lg border border-store-line bg-store-surface p-xl">
      <h2 className="text-heading-md font-semibold text-store-ink">Datos personales</h2>
      <form onSubmit={onSubmit} noValidate className="mt-md space-y-md">
        {mensaje && <Alerta tipo={mensaje.tipo === 'exito' ? 'exito' : 'error'}>{mensaje.texto}</Alerta>}

        <div>
          <label htmlFor="per-email" className={LABEL_STORE}>Correo electrónico</label>
          <Input id="per-email" value={perfil.email} readOnly disabled className={INPUT_STORE} />
          <p className="mt-xs text-xs text-store-ink-mute">El correo de acceso no se puede cambiar aquí.</p>
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="per-tipo" className={LABEL_STORE}>Tipo de documento</label>
            <select id="per-tipo" value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)} className={SELECT_STORE}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="per-numero" className={LABEL_STORE}>Número de documento</label>
            <Input id="per-numero" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} inputMode="numeric" className={INPUT_STORE} />
          </div>
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="per-nombres" className={LABEL_STORE}>Nombres</label>
            <Input id="per-nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="per-apellidos" className={LABEL_STORE}>Apellidos</label>
            <Input id="per-apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={INPUT_STORE} />
          </div>
        </div>

        <div>
          <label htmlFor="per-telefono" className={LABEL_STORE}>Teléfono</label>
          <Input id="per-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" className={INPUT_STORE} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting} className={cn(BOTON_STORE, 'w-auto px-lg')}>
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </section>
  );
}

// ─── Seguridad (contraseña) ───────────────────────────────────────────────────

function Seguridad(): React.ReactElement {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nuevaValida = nueva.length >= 8 && /[A-Z]/.test(nueva) && /[0-9]/.test(nueva);
  const coinciden = nueva === confirmar;
  const puedeEnviar = actual.length > 0 && nuevaValida && coinciden;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setMensaje(null);
    if (!puedeEnviar) return;
    setIsSubmitting(true);
    try {
      const json = await cuentaApi.cambiarPassword({ password_actual: actual, password_nueva: nueva });
      if (!json.success) {
        setMensaje({ tipo: 'error', texto: json.error.message });
        return;
      }
      setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada correctamente.' });
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err instanceof ApiClientError ? err.message : 'Error al cambiar' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-lg border border-store-line bg-store-surface p-xl">
      <h2 className="text-heading-md font-semibold text-store-ink">Seguridad</h2>
      <form onSubmit={onSubmit} noValidate className="mt-md space-y-md">
        {mensaje && <Alerta tipo={mensaje.tipo === 'exito' ? 'exito' : 'error'}>{mensaje.texto}</Alerta>}

        <div>
          <label htmlFor="seg-actual" className={LABEL_STORE}>Contraseña actual</label>
          <Input id="seg-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" className={INPUT_STORE} />
        </div>
        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="seg-nueva" className={LABEL_STORE}>Nueva contraseña</label>
            <Input id="seg-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" invalid={nueva.length > 0 && !nuevaValida} className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="seg-confirmar" className={LABEL_STORE}>Confirmar contraseña</label>
            <Input id="seg-confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" invalid={confirmar.length > 0 && !coinciden} className={INPUT_STORE} />
          </div>
        </div>
        {nueva.length > 0 && !nuevaValida && (
          <p role="alert" aria-live="polite" className="text-xs text-store-offer">Mínimo 8 caracteres, una mayúscula y un número.</p>
        )}
        {confirmar.length > 0 && !coinciden && (
          <p role="alert" aria-live="polite" className="text-xs text-store-offer">Las contraseñas no coinciden.</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting} disabled={!puedeEnviar} className={cn(BOTON_STORE, 'w-auto px-lg')}>
            {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </div>
      </form>
    </section>
  );
}

// ─── Libreta de direcciones ───────────────────────────────────────────────────

interface DireccionModalProps {
  direccion: DireccionItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function DireccionModal({ direccion, onClose, onSaved }: DireccionModalProps): React.ReactElement {
  const editing = direccion !== null;
  const [departamento, setDepartamento] = useState(direccion?.departamento ?? '');
  const [provincia, setProvincia] = useState(direccion?.provincia ?? '');
  const [distrito, setDistrito] = useState(direccion?.distrito ?? '');
  const [linea, setLinea] = useState(direccion?.direccion_linea ?? '');
  const [referencia, setReferencia] = useState(direccion?.referencia ?? '');
  const [codigoPostal, setCodigoPostal] = useState(direccion?.codigo_postal ?? '');
  const [esPrincipal, setEsPrincipal] = useState(direccion?.es_principal ?? false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const puedeGuardar =
    departamento.trim().length >= 2 &&
    provincia.trim().length >= 2 &&
    distrito.trim().length >= 2 &&
    linea.trim().length >= 3;

  const onSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setServerError(null);
    if (!puedeGuardar) return;
    setIsSubmitting(true);
    const payload: DireccionPayload = {
      departamento: departamento.trim(),
      provincia: provincia.trim(),
      distrito: distrito.trim(),
      direccion_linea: linea.trim(),
      referencia: referencia.trim() || null,
      codigo_postal: codigoPostal.trim() || null,
      es_principal: esPrincipal,
    };
    try {
      const json = editing && direccion
        ? await cuentaApi.actualizarDireccion(direccion.id, payload)
        : await cuentaApi.crearDireccion(payload);
      if (!json.success) {
        setServerError(json.error.message);
        return;
      }
      onSaved();
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : 'Error al guardar la dirección');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="dir-modal-titulo" panelClassName="max-w-lg">
      <div className="mb-lg flex items-center justify-between">
        <h2 id="dir-modal-titulo" className="text-sm font-semibold text-ink">
          {editing ? 'Editar dirección' : 'Nueva dirección'}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {serverError && <div className="mb-md"><Alerta tipo="error">{serverError}</Alerta></div>}

      <form onSubmit={onSubmit} noValidate className="space-y-md">
        <div className="grid gap-md sm:grid-cols-3">
          <div>
            <label htmlFor="dir-dep" className={LABEL_STORE}>Departamento</label>
            <Input id="dir-dep" value={departamento} onChange={(e) => setDepartamento(e.target.value)} placeholder="Lima" className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="dir-prov" className={LABEL_STORE}>Provincia</label>
            <Input id="dir-prov" value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Lima" className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="dir-dist" className={LABEL_STORE}>Distrito</label>
            <Input id="dir-dist" value={distrito} onChange={(e) => setDistrito(e.target.value)} placeholder="Miraflores" className={INPUT_STORE} />
          </div>
        </div>

        <div>
          <label htmlFor="dir-linea" className={LABEL_STORE}>Dirección</label>
          <Input id="dir-linea" value={linea} onChange={(e) => setLinea(e.target.value)} placeholder="Av. Larco 123, Dpto. 401" className={INPUT_STORE} />
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="dir-ref" className={LABEL_STORE}>Referencia (opcional)</label>
            <Input id="dir-ref" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Frente al parque" className={INPUT_STORE} />
          </div>
          <div>
            <label htmlFor="dir-cp" className={LABEL_STORE}>Código postal (opcional)</label>
            <Input id="dir-cp" value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} className={INPUT_STORE} />
          </div>
        </div>

        <label className="flex items-center gap-sm text-sm text-store-ink">
          <input type="checkbox" checked={esPrincipal} onChange={(e) => setEsPrincipal(e.target.checked)} className="h-4 w-4 accent-store-ink" />
          Usar como dirección principal
        </label>

        <div className="flex items-center justify-end gap-sm pt-md">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!puedeGuardar}>
            {isSubmitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar dirección'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MisDirecciones(): React.ReactElement {
  const [direcciones, setDirecciones] = useState<DireccionItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<{ direccion: DireccionItem | null } | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setStatus('loading');
    cuentaApi
      .listarDirecciones()
      .then((json) => {
        if (!activo) return;
        if (!json.success) {
          setStatus('error');
          return;
        }
        setDirecciones(json.data);
        setStatus('ready');
      })
      .catch(() => {
        if (activo) setStatus('error');
      });
    return () => {
      activo = false;
    };
  }, [reloadKey]);

  const recargar = useCallback(() => setReloadKey((k) => k + 1), []);

  const marcarPrincipal = useCallback(async (dir: DireccionItem): Promise<void> => {
    setOcupadoId(dir.id);
    setError(null);
    try {
      const json = await cuentaApi.marcarPrincipal(dir.id);
      if (!json.success) setError(json.error.message);
      else recargar();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al actualizar');
    } finally {
      setOcupadoId(null);
    }
  }, [recargar]);

  const eliminar = useCallback(async (dir: DireccionItem): Promise<void> => {
    setOcupadoId(dir.id);
    setError(null);
    try {
      const json = await cuentaApi.eliminarDireccion(dir.id);
      if (!json.success) setError(json.error.message);
      else recargar();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Error al eliminar');
    } finally {
      setOcupadoId(null);
    }
  }, [recargar]);

  return (
    <section className="rounded-lg border border-store-line bg-store-surface p-xl">
      <div className="flex items-center justify-between gap-md">
        <h2 className="text-heading-md font-semibold text-store-ink">Mis direcciones</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => setModal({ direccion: null })}>
          <Plus size={14} aria-hidden="true" />
          Agregar
        </Button>
      </div>

      {error && <div className="mt-md"><Alerta tipo="error">{error}</Alerta></div>}

      <div className="mt-md space-y-sm">
        {status === 'loading' && (
          <>
            <div className="h-20 animate-pulse rounded-md bg-store-line/40" />
            <div className="h-20 animate-pulse rounded-md bg-store-line/40" />
          </>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-md py-lg text-center">
            <p className="text-sm text-store-ink-soft">No se pudieron cargar tus direcciones.</p>
            <Button type="button" variant="secondary" size="sm" onClick={recargar}>Reintentar</Button>
          </div>
        )}

        {status === 'ready' && direcciones.length === 0 && (
          <div className="flex flex-col items-center gap-sm rounded-md border border-dashed border-store-line py-xl text-center">
            <MapPin size={20} className="text-store-ink-mute" aria-hidden="true" />
            <p className="text-sm font-medium text-store-ink">Aún no tienes direcciones</p>
            <p className="text-xs text-store-ink-soft">Agrega una para agilizar tus próximas compras.</p>
          </div>
        )}

        {status === 'ready' && direcciones.map((dir) => (
          <div key={dir.id} className="flex flex-wrap items-start justify-between gap-sm rounded-md border border-store-line p-md">
            <div className="flex flex-col gap-xxs">
              <div className="flex items-center gap-sm">
                <span className="text-sm font-medium text-store-ink">
                  {dir.direccion_linea}
                </span>
                {dir.es_principal && (
                  <span className="inline-flex items-center gap-xs rounded-full bg-store-ok/10 px-sm py-xxs text-xs font-medium text-store-ok">
                    <Star size={11} aria-hidden="true" /> Principal
                  </span>
                )}
              </div>
              <span className="text-sm text-store-ink-soft">
                {dir.distrito}, {dir.provincia} — {dir.departamento}
              </span>
              {dir.referencia && <span className="text-xs text-store-ink-mute">Ref: {dir.referencia}</span>}
            </div>

            <div className="flex items-center gap-xs">
              {!dir.es_principal && (
                <Button type="button" variant="ghost" size="sm" isLoading={ocupadoId === dir.id} onClick={() => marcarPrincipal(dir)}>
                  Hacer principal
                </Button>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={() => setModal({ direccion: dir })}>
                <Pencil size={12} aria-hidden="true" /> Editar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => eliminar(dir)}
                aria-label={`Eliminar dirección ${dir.direccion_linea}`}
                className="text-store-ink-mute hover:bg-store-offer/8 hover:text-store-offer"
              >
                <Trash2 size={13} aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <DireccionModal
          direccion={modal.direccion}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            recargar();
          }}
        />
      )}
    </section>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function PerfilPage(): React.ReactElement {
  const { usuario } = useAuth();
  const perfil = useApiData<PerfilCliente>('/api/v1/me');

  return (
    <div className="mx-auto w-full max-w-[880px] py-xl">
      <div className="mb-lg flex flex-wrap items-end justify-between gap-sm">
        <div>
          <h1 className="text-display-md font-semibold text-store-ink">Mi cuenta</h1>
          <p className="mt-xs text-sm text-store-ink-soft">
            Hola{perfil.estado.status === 'success' && perfil.estado.data.nombres
              ? `, ${perfil.estado.data.nombres}`
              : usuario?.nombre
                ? `, ${usuario.nombre}`
                : ''}
            . Gestiona tus datos, seguridad y direcciones.
          </p>
        </div>
        <Link to="/catalogo" className="text-sm font-medium text-store-accent hover:underline">
          Seguir comprando
        </Link>
      </div>

      {perfil.estado.status === 'loading' && (
        <div className="space-y-lg">
          <div className="h-64 animate-pulse rounded-lg border border-store-line bg-store-surface" />
          <div className="h-48 animate-pulse rounded-lg border border-store-line bg-store-surface" />
        </div>
      )}

      {perfil.estado.status === 'error' && (
        <div className="flex flex-col items-center gap-md rounded-lg border border-store-line bg-store-surface p-xl text-center">
          <p className="text-sm font-medium text-store-ink">No se pudo cargar tu perfil</p>
          <p className="text-sm text-store-ink-soft">{perfil.estado.message}</p>
          <Button type="button" variant="secondary" onClick={perfil.recargar}>Reintentar</Button>
        </div>
      )}

      {perfil.estado.status === 'success' && (
        <div className="grid gap-lg">
          <DatosPersonales perfil={perfil.estado.data} />
          <Seguridad />
          <MisDirecciones />
        </div>
      )}
    </div>
  );
}

export default PerfilPage;
