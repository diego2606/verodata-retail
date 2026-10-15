import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn, CONTENEDOR_TIENDA } from '../../../lib/utils';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Alerta, INPUT_STORE, LABEL_STORE } from '../../../components/storefront/CuentaCard';
import { useAuth } from '../../../context/AuthContext';
import { useApiData } from '../../../lib/useApiData';
import { cuentaApi } from '../../../lib/cuenta';
import { ApiClientError } from '../../../lib/apiClient';
import {
  formatearCoordenadas,
  type Coordenadas,
  type UbicacionSeleccionada,
} from '../../../lib/mapaUbicacion';
import type {
  DireccionItem,
  DireccionPayload,
  PerfilCliente,
  TipoDocumento,
} from '../../../types/cuenta.types';

/**
 * El selector de mapa se carga de forma diferida: ni el bundle de
 * `@vis.gl/react-google-maps` ni el script de Google viajan al navegador
 * hasta que el usuario pulsa "Seleccionar ubicación en el mapa".
 */
const MapaUbicacionPicker = React.lazy(
  () => import('../../../components/storefront/MapaUbicacionPicker')
);

/** Skeleton que calca la silueta del mapa mientras se descarga el chunk. */
function SkeletonMapa(): React.ReactElement {
  return (
    <div className="space-y-sm" aria-hidden="true">
      <div className="h-72 w-full animate-pulse rounded-md bg-store-line/40 sm:h-96" />
      <div className="h-3 w-64 animate-pulse rounded-full bg-store-line/40" />
      <div className="flex justify-end gap-sm">
        <div className="h-7 w-20 animate-pulse rounded-md bg-store-line/40" />
        <div className="h-7 w-36 animate-pulse rounded-md bg-store-line/40" />
      </div>
    </div>
  );
}

const SELECT_STORE =
  'h-9 w-full rounded-md border border-store-line bg-store-surface px-sm text-sm text-store-ink focus:outline-none focus:ring-1 focus:ring-store-accent';

const TIPOS: TipoDocumento[] = ['DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA'];

type SeccionKey = 'datos' | 'direcciones' | 'seguridad';

interface SeccionDef {
  key: SeccionKey;
  label: string;
  icon: LucideIcon;
}

const SECCIONES: SeccionDef[] = [
  { key: 'datos', label: 'Datos personales', icon: User },
  { key: 'direcciones', label: 'Direcciones', icon: MapPin },
  { key: 'seguridad', label: 'Configurar mi cuenta', icon: ShieldCheck },
];

/** Permite abrir el perfil directo en una sección vía `?seccion=direcciones`. */
function esSeccionKey(valor: string | null): valor is SeccionKey {
  return SECCIONES.some((seccion) => seccion.key === valor);
}

// ─── Piezas de UI ─────────────────────────────────────────────────────────────

function Tooltip({ texto }: { texto: string }): React.ReactElement {
  return (
    <span className="group relative inline-flex">
      <AlertCircle size={14} className="text-store-ink-mute" aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-xs w-56 -translate-x-1/2 rounded-md border border-store-line bg-store-surface p-sm text-xs font-normal normal-case tracking-normal text-store-ink-soft opacity-0 transition-opacity group-hover:opacity-100"
      >
        {texto}
      </span>
    </span>
  );
}

interface FilaCamposProps {
  titulo: string;
  valor: React.ReactNode;
  /** Si se pasa, la fila es editable y muestra el botón "Editar". */
  editor?: React.ReactNode;
  onGuardar?: () => Promise<void>;
  puedeGuardar?: boolean;
  tooltip?: string;
}

/** Fila etiqueta/valor con edición por campo (patrón "Mi perfil"). */
function FilaCampos({
  titulo,
  valor,
  editor,
  onGuardar,
  puedeGuardar = true,
  tooltip,
}: FilaCamposProps): React.ReactElement {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (): Promise<void> => {
    if (!onGuardar) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar();
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="border-b border-store-line py-lg last:border-b-0">
      {!editando ? (
        <div className="flex items-start justify-between gap-md">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-store-ink-soft">{titulo}</p>
            <div className="mt-xs flex items-center gap-sm text-base text-store-ink">
              {valor}
              {tooltip && <Tooltip texto={tooltip} />}
            </div>
          </div>
          {editor && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="shrink-0 text-sm font-medium text-store-ink underline underline-offset-2 hover:text-store-accent"
            >
              Editar
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          <p className="text-sm text-store-ink-soft">{titulo}</p>
          {editor}
          {error && (
            <p role="alert" aria-live="polite" className="text-xs text-store-offer">
              {error}
            </p>
          )}
          <div className="flex items-center gap-sm">
            <Button
              type="button"
              size="sm"
              isLoading={guardando}
              disabled={!puedeGuardar}
              onClick={guardar}
              className="rounded-md bg-store-ink text-white hover:bg-store-ink/90"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditando(false);
                setError(null);
              }}
              className="rounded-md"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Datos personales ─────────────────────────────────────────────────────────

interface DatosProps {
  perfil: PerfilCliente;
  onActualizado: () => void;
}

function SeccionDatos({ perfil, onActualizado }: DatosProps): React.ReactElement {
  const { usuario, actualizarSesion } = useAuth();

  const [nombres, setNombres] = useState(perfil.nombres ?? '');
  const [apellidos, setApellidos] = useState(perfil.apellidos ?? '');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(perfil.tipo_documento ?? 'DNI');
  const [numeroDocumento, setNumeroDocumento] = useState(perfil.numero_documento ?? '');
  const [telefono, setTelefono] = useState(perfil.telefono ?? '');
  const [avisoGlobal, setAvisoGlobal] = useState<string | null>(null);

  const guardar = async (payload: Parameters<typeof cuentaApi.actualizarPerfil>[0]): Promise<void> => {
    const json = await cuentaApi.actualizarPerfil(payload);
    if (!json.success) throw new Error(json.error.message);
    if (usuario) actualizarSesion({ ...usuario, nombre: json.data.nombres });
    onActualizado();
    setAvisoGlobal('Datos actualizados correctamente.');
  };

  const conCatcher = (payload: Parameters<typeof cuentaApi.actualizarPerfil>[0]) => async (): Promise<void> => {
    try {
      await guardar(payload);
    } catch (err) {
      throw new Error(err instanceof ApiClientError ? err.message : 'Error al guardar');
    }
  };

  return (
    <div>
      {!perfil.perfil_completo && (
        <div className="mb-md">
          <Alerta tipo="info">
            Te falta registrar tu <strong>documento de identidad</strong> para poder comprar.
          </Alerta>
        </div>
      )}
      {avisoGlobal && (
        <div className="mb-md">
          <Alerta tipo="exito">{avisoGlobal}</Alerta>
        </div>
      )}

      <div className="flex flex-col">
        <FilaCampos
          titulo="Nombre y apellidos"
          valor={`${perfil.nombres ?? ''} ${perfil.apellidos ?? ''}`.trim() || '—'}
          editor={
            <div className="grid gap-sm sm:grid-cols-2">
              <Input aria-label="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} className={INPUT_STORE} />
              <Input aria-label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={INPUT_STORE} />
            </div>
          }
          puedeGuardar={nombres.trim().length >= 2 && apellidos.trim().length >= 2}
          onGuardar={conCatcher({ nombres: nombres.trim(), apellidos: apellidos.trim() })}
        />

        <FilaCampos
          titulo="Tipo de documento"
          valor={
            perfil.tipo_documento && perfil.numero_documento
              ? `${perfil.tipo_documento} ${perfil.numero_documento}`
              : 'Sin registrar'
          }
          editor={
            <div className="grid gap-sm sm:grid-cols-2">
              <select
                aria-label="Tipo de documento"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                className={SELECT_STORE}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Input
                aria-label="Número de documento"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                inputMode="numeric"
                className={INPUT_STORE}
              />
            </div>
          }
          puedeGuardar={numeroDocumento.trim().length >= 6}
          onGuardar={conCatcher({
            tipo_documento: tipoDocumento,
            numero_documento: numeroDocumento.trim(),
          })}
        />

        <FilaCampos
          titulo="Celular"
          valor={perfil.telefono || 'Sin registrar'}
          editor={
            <Input
              aria-label="Celular"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              inputMode="tel"
              className={INPUT_STORE}
            />
          }
          puedeGuardar={telefono.trim().length >= 9}
          onGuardar={conCatcher({ telefono: telefono.trim() })}
        />

        <FilaCampos
          titulo="Correo"
          valor={perfil.email}
          tooltip="Por tu seguridad, no es posible editar tu correo. Si necesitas usar otro, crea una nueva cuenta."
        />
      </div>
    </div>
  );
}

// ─── Seguridad (contraseña) ───────────────────────────────────────────────────

function SeccionSeguridad(): React.ReactElement {
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
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-md">
      <h3 className="text-heading-md font-semibold text-store-ink">Cambiar contraseña</h3>
      {mensaje && <Alerta tipo={mensaje.tipo === 'exito' ? 'exito' : 'error'}>{mensaje.texto}</Alerta>}

      <div>
        <label htmlFor="seg-actual" className={LABEL_STORE}>Contraseña actual</label>
        <Input id="seg-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" className={INPUT_STORE} />
      </div>
      <div>
        <label htmlFor="seg-nueva" className={LABEL_STORE}>Nueva contraseña</label>
        <Input id="seg-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" invalid={nueva.length > 0 && !nuevaValida} className={INPUT_STORE} />
        <p className="mt-xs text-xs text-store-ink-mute">Mínimo 8 caracteres, una mayúscula y un número.</p>
      </div>
      <div>
        <label htmlFor="seg-confirmar" className={LABEL_STORE}>Confirmar contraseña</label>
        <Input id="seg-confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" invalid={confirmar.length > 0 && !coinciden} className={INPUT_STORE} />
        {confirmar.length > 0 && !coinciden && (
          <p role="alert" aria-live="polite" className="mt-xs text-xs text-store-offer">Las contraseñas no coinciden.</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} disabled={!puedeEnviar} className="rounded-md bg-store-ink px-lg text-white hover:bg-store-ink/90">
          {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  );
}

// ─── Direcciones ──────────────────────────────────────────────────────────────

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
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(
    direccion?.latitud != null && direccion?.longitud != null
      ? { lat: direccion.latitud, lng: direccion.longitud }
      : null
  );
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const puedeGuardar =
    departamento.trim().length >= 2 &&
    provincia.trim().length >= 2 &&
    distrito.trim().length >= 2 &&
    linea.trim().length >= 3;

  /** Vuelca la ubicación elegida en el mapa sobre el formulario. */
  const aplicarUbicacion = (ubicacion: UbicacionSeleccionada): void => {
    if (ubicacion.departamento) setDepartamento(ubicacion.departamento);
    if (ubicacion.provincia) setProvincia(ubicacion.provincia);
    if (ubicacion.distrito) setDistrito(ubicacion.distrito);
    if (ubicacion.direccion_linea) setLinea(ubicacion.direccion_linea);
    if (ubicacion.codigo_postal) setCodigoPostal(ubicacion.codigo_postal);
    setCoordenadas({ lat: ubicacion.latitud, lng: ubicacion.longitud });
    setMapaAbierto(false);
  };

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
      latitud: coordenadas?.lat ?? null,
      longitud: coordenadas?.lng ?? null,
      es_principal: esPrincipal,
    };
    try {
      const json =
        editing && direccion
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
    <Modal
      onClose={onClose}
      labelledBy="dir-modal-titulo"
      panelClassName={mapaAbierto ? 'max-w-3xl' : 'max-w-lg'}
    >
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

        {/* Ubicación exacta en Google Maps — carga diferida del SDK */}
        <div className="rounded-md border border-store-line p-md">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <div className="min-w-0">
              <p className="text-sm font-medium text-store-ink">Ubicación exacta en el mapa</p>
              <p className="mt-xxs text-xs text-store-ink-soft">
                {coordenadas
                  ? `Marcada en ${formatearCoordenadas(coordenadas)}.`
                  : 'Opcional: marca tu puerta para agilizar la entrega.'}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-expanded={mapaAbierto}
              onClick={() => setMapaAbierto((abierto) => !abierto)}
            >
              <MapPin size={13} aria-hidden="true" />
              {mapaAbierto ? 'Ocultar mapa' : 'Seleccionar ubicación en el mapa'}
            </Button>
          </div>

          {coordenadas && !mapaAbierto && (
            <button
              type="button"
              onClick={() => setCoordenadas(null)}
              className="mt-sm text-xs text-store-ink-mute underline underline-offset-2 hover:text-store-offer"
            >
              Quitar ubicación marcada
            </button>
          )}

          {mapaAbierto && (
            <div className="mt-md">
              <Suspense fallback={<SkeletonMapa />}>
                <MapaUbicacionPicker
                  centroInicial={coordenadas}
                  onConfirmar={aplicarUbicacion}
                  onCancelar={() => setMapaAbierto(false)}
                />
              </Suspense>
            </div>
          )}
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

function SeccionDirecciones(): React.ReactElement {
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

  const marcarPrincipal = useCallback(
    async (dir: DireccionItem): Promise<void> => {
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
    },
    [recargar]
  );

  const eliminar = useCallback(
    async (dir: DireccionItem): Promise<void> => {
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
    },
    [recargar]
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-md">
        <h3 className="text-heading-md font-semibold text-store-ink">Mis direcciones</h3>
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

        {status === 'ready' &&
          direcciones.map((dir) => (
            <div key={dir.id} className="flex flex-wrap items-start justify-between gap-sm rounded-md border border-store-line p-md">
              <div className="flex flex-col gap-xxs">
                <div className="flex items-center gap-sm">
                  <span className="text-sm font-medium text-store-ink">{dir.direccion_linea}</span>
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
                {dir.latitud != null && dir.longitud != null && (
                  <span className="inline-flex items-center gap-xs text-xs text-store-ink-mute">
                    <MapPin size={11} aria-hidden="true" />
                    Ubicación marcada en el mapa
                  </span>
                )}
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
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function PerfilPage(): React.ReactElement {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const perfil = useApiData<PerfilCliente>('/api/v1/me');
  const [seccion, setSeccion] = useState<SeccionKey>(() => {
    const inicial = searchParams.get('seccion');
    return esSeccionKey(inicial) ? inicial : 'datos';
  });

  // Si se navega al perfil con `?seccion=` estando ya montado, cambia de pestaña.
  useEffect(() => {
    const solicitada = searchParams.get('seccion');
    if (esSeccionKey(solicitada)) setSeccion(solicitada);
  }, [searchParams]);

  const cerrarSesion = (): void => {
    logout();
    navigate('/');
  };

  return (
    <div className={`${CONTENEDOR_TIENDA} py-xl`}>
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-xs text-sm text-store-ink-soft hover:text-store-ink"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Mi cuenta
      </Link>
      <h1 className="mt-sm text-display-md font-semibold text-store-ink">Mi perfil</h1>
      <p className="mt-xs text-sm text-store-ink-soft">
        Hola
        {perfil.estado.status === 'success' && perfil.estado.data.nombres
          ? `, ${perfil.estado.data.nombres}`
          : usuario?.nombre
            ? `, ${usuario.nombre}`
            : ''}
        . Gestiona tus datos, seguridad y direcciones.
      </p>

      <div className="mt-lg grid items-start gap-lg md:grid-cols-[256px_1fr]">
        {/* Menú lateral */}
        <aside className="overflow-hidden rounded-lg border border-store-line bg-store-surface">
          <nav className="flex flex-col" aria-label="Secciones de mi cuenta">
            {SECCIONES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-current={seccion === key}
                onClick={() => setSeccion(key)}
                className={cn(
                  'flex items-center gap-md border-b border-store-line px-lg py-md text-left text-sm transition-colors hover:bg-store-canvas',
                  seccion === key ? 'font-semibold text-store-ink' : 'text-store-ink-soft'
                )}
              >
                <Icon size={22} aria-hidden="true" className="shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight size={16} className="shrink-0 text-store-ink-mute" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex items-center gap-md px-lg py-md text-left text-sm text-store-ink-soft transition-colors hover:bg-store-canvas hover:text-store-offer"
            >
              <LogOut size={22} aria-hidden="true" className="shrink-0" />
              <span className="flex-1">Cerrar sesión</span>
              <ChevronRight size={16} className="shrink-0 text-store-ink-mute" aria-hidden="true" />
            </button>
          </nav>
        </aside>

        {/* Panel de contenido */}
        <section className="min-w-0">
          <h2 className="mb-md text-heading-lg font-semibold text-store-ink">
            {SECCIONES.find((s) => s.key === seccion)?.label}
          </h2>
          <div className="rounded-lg border border-store-line bg-store-surface p-xl">
          {perfil.estado.status === 'loading' && (
            <div className="space-y-md">
              <div className="h-5 w-40 animate-pulse rounded-full bg-store-line" />
              <div className="h-14 animate-pulse rounded-md bg-store-line/40" />
              <div className="h-14 animate-pulse rounded-md bg-store-line/40" />
            </div>
          )}

          {perfil.estado.status === 'error' && (
            <div className="flex flex-col items-center gap-md py-lg text-center">
              <p className="text-sm font-medium text-store-ink">No se pudo cargar tu perfil</p>
              <p className="text-sm text-store-ink-soft">{perfil.estado.message}</p>
              <Button type="button" variant="secondary" onClick={perfil.recargar}>Reintentar</Button>
            </div>
          )}

          {perfil.estado.status === 'success' && (
            <>
              {seccion === 'datos' && (
                <SeccionDatos perfil={perfil.estado.data} onActualizado={perfil.recargar} />
              )}
              {seccion === 'direcciones' && <SeccionDirecciones />}
              {seccion === 'seguridad' && <SeccionSeguridad />}
            </>
          )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default PerfilPage;
