/** Fila devuelta por GET /api/v1/colors (HU032). */
export interface ColorItem {
  id: number;
  nombre: string;
  slug: string;
  hex: string;
  activo: boolean;
  creado_en: string;
}

export interface CrearColorPayload {
  nombre: string;
  hex: string;
}

export interface ActualizarColorPayload {
  nombre?: string;
  hex?: string;
  activo?: boolean;
}
