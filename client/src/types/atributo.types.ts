/** Maestro de atributos (HU — Atributos). */

export type TipoAtributo = 'TEXTO' | 'COLOR' | 'NUMERO' | 'BOOLEANO';

export interface AtributoValorItem {
  id: number;
  atributo_id: number;
  valor: string;
  slug: string;
  hex: string | null;
  meta: Record<string, unknown> | null;
  activo: boolean;
  orden: number;
  /** Nº de productos que usan este valor. */
  usos: number;
}

export interface AtributoItem {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoAtributo;
  es_variante: boolean;
  unidad: string | null;
  activo: boolean;
  orden: number;
  valores: AtributoValorItem[];
}

export interface CrearAtributoPayload {
  codigo?: string;
  nombre: string;
  tipo: TipoAtributo;
  es_variante?: boolean;
  unidad?: string | null;
  activo?: boolean;
  orden?: number;
}

export type ActualizarAtributoPayload = Partial<Omit<CrearAtributoPayload, 'codigo'>>;

export interface CrearValorPayload {
  valor: string;
  hex?: string | null;
  meta?: Record<string, unknown> | null;
  activo?: boolean;
  orden?: number;
}

export type ActualizarValorPayload = Partial<CrearValorPayload>;
