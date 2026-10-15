/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API del backend. */
  readonly VITE_API_URL?: string;
  /**
   * Clave pública (Browser key) de Google Maps JavaScript API.
   * Debe estar restringida por HTTP referrer en Google Cloud Console.
   * Si falta, el selector de mapa se muestra deshabilitado.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
