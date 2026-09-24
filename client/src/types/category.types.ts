/** Fila devuelta por GET /api/v1/categories */
export interface CategoriaItem {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: string;
  productos_count: number;
}

export interface CrearCategoriaPayload {
  nombre: string;
  slug?: string;
  descripcion?: string;
}

export interface ActualizarCategoriaPayload {
  nombre?: string;
  slug?: string;
  descripcion?: string;
  activo?: boolean;
}
