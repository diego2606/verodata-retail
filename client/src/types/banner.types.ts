/** Tipos del contenido editorial administrable (HU034). */

export type BannerUbicacion = 'HERO' | 'TICKER' | 'BANDA_EDITORIAL';

export interface BannerItem {
  id: string;
  ubicacion: BannerUbicacion;
  titulo: string;
  /** Sobre-título (eyebrow) sobre el titular. */
  etiqueta: string | null;
  subtitulo: string | null;
  cta_texto: string | null;
  cta_url: string | null;
  imagen_url: string;
  orden: number;
  activo: boolean;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface CrearBannerPayload {
  ubicacion: BannerUbicacion;
  titulo: string;
  etiqueta?: string | null;
  subtitulo?: string | null;
  cta_texto?: string | null;
  cta_url?: string | null;
  imagen_url: string;
  orden?: number;
  activo?: boolean;
  vigente_desde?: string | null;
  vigente_hasta?: string | null;
}

export type ActualizarBannerPayload = Partial<CrearBannerPayload>;

export interface SiteConfigItem {
  clave: string;
  valor: unknown;
  actualizado_en: string;
}

/** Ítem de la franja de confianza (config `franja_confianza`). */
export interface FranjaConfianza {
  titulo: string;
  texto: string;
}
