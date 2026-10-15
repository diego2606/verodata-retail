/**
 * Ubicación de entrega del storefront (sub-bar del header, HU017).
 *
 * La elección del cliente vive en `localStorage`: no hay columna en la base
 * para "distrito preferido", así que es una preferencia de navegador, no un
 * dato de negocio. Se apoya en la libreta de direcciones (`direcciones`).
 */
import type { DireccionItem } from '../types/cuenta.types';

export interface UbicacionEntrega {
  direccionId: string;
  distrito: string;
  provincia: string;
}

const STORAGE_KEY = 'verodata_ubicacion_entrega';

/** Lee la ubicación guardada; `null` si no existe o el JSON es inválido. */
export function leerUbicacionEntrega(): UbicacionEntrega | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as UbicacionEntrega).direccionId === 'string' &&
      typeof (data as UbicacionEntrega).distrito === 'string' &&
      typeof (data as UbicacionEntrega).provincia === 'string'
    ) {
      const { direccionId, distrito, provincia } = data as UbicacionEntrega;
      return { direccionId, distrito, provincia };
    }
    return null;
  } catch {
    return null;
  }
}

/** Persiste la elección. Si el almacenamiento no está disponible, no revienta. */
export function guardarUbicacionEntrega(ubicacion: UbicacionEntrega): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ubicacion));
  } catch {
    // p. ej. modo privado con cuota llena: la selección sigue viva en memoria
  }
}

/** Proyecta una dirección de la libreta como ubicación de entrega. */
export function ubicacionDesdeDireccion(direccion: DireccionItem): UbicacionEntrega {
  return {
    direccionId: direccion.id,
    distrito: direccion.distrito,
    provincia: direccion.provincia,
  };
}

/** Ubicación por defecto: la dirección principal; si no, la primera. */
export function ubicacionPorDefecto(direcciones: DireccionItem[]): UbicacionEntrega | null {
  const principal = direcciones.find((d) => d.es_principal) ?? direcciones[0];
  return principal ? ubicacionDesdeDireccion(principal) : null;
}

/**
 * Resuelve la ubicación vigente: la elegida si su dirección sigue existiendo;
 * si el cliente la borró, cae a la principal. Evita que el header muestre un
 * distrito fantasma.
 */
export function resolverUbicacion(
  elegida: UbicacionEntrega | null,
  direcciones: DireccionItem[]
): UbicacionEntrega | null {
  if (elegida) {
    const vigente = direcciones.find((d) => d.id === elegida.direccionId);
    if (vigente) return ubicacionDesdeDireccion(vigente);
  }
  return ubicacionPorDefecto(direcciones);
}

/** Normaliza para comparar sin acentos ni mayúsculas. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Filtra la libreta por distrito, provincia, departamento, línea o referencia. */
export function filtrarDirecciones(
  direcciones: DireccionItem[],
  termino: string
): DireccionItem[] {
  const consulta = normalizar(termino);
  if (consulta.length === 0) return direcciones;
  return direcciones.filter((direccion) =>
    [direccion.distrito, direccion.provincia, direccion.departamento, direccion.direccion_linea, direccion.referencia ?? ''].some(
      (campo) => normalizar(campo).includes(consulta)
    )
  );
}
