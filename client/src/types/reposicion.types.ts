export type EstadoReposicion = 'PENDIENTE' | 'RECIBIDO' | 'CANCELADO';

export interface ProveedorItem {
  id: string;
  nombre_empresa: string;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  categoria_productos: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface CrearProveedorPayload {
  nombre_empresa: string;
  contacto_nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  categoria_productos?: string | null;
}

/** Cabecera de una orden de reposición (GET /api/v1/reposiciones). */
export interface ReposicionItem {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  estado: EstadoReposicion;
  fecha_emision: string;
  fecha_estimada_arribo: string | null;
  notas: string | null;
  costo_total: number;
  unidades_totales: number;
  usuario_id: string | null;
  motivo_cancelacion: string | null;
  recibido_en: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Línea del detalle con los datos del SKU resueltos. */
export interface ReposicionLinea {
  id: string;
  producto_id: string;
  sku: string;
  producto_nombre: string;
  atributos: Record<string, string>;
  costo_unitario: number;
  cantidad_pedida: number;
  subtotal: number;
}

export interface ReposicionDetalle extends ReposicionItem {
  detalles: ReposicionLinea[];
}

export interface PaginaReposiciones {
  items: ReposicionItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CrearReposicionPayload {
  proveedor_id: string;
  fecha_estimada_arribo?: string | null;
  notas?: string | null;
  detalles: Array<{
    producto_id: string;
    costo_unitario: number;
    cantidad_pedida: number;
  }>;
}

/** Resumen devuelto por PATCH /api/v1/reposiciones/:id/recibir. */
export interface RecepcionResultado {
  id: string;
  estado: 'RECIBIDO';
  lineas_actualizadas: number;
  unidades_ingresadas: number;
}

export interface FiltrosReposiciones {
  page: number;
  limit: number;
  estado?: EstadoReposicion;
  proveedor_id?: string;
}

/**
 * Fila editable del formulario. Los campos numéricos viven como texto para que
 * el input pueda quedar vacío mientras el usuario escribe; se convierten al armar
 * el payload (ver `aNumero` en `totales.ts`).
 */
export interface LineaDraft {
  key: string;
  producto_id: string;
  costo_unitario: string;
  cantidad_pedida: string;
}
