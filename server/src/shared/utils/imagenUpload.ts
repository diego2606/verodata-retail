import { randomBytes } from 'node:crypto';
import { supabaseConfigurado, subirImagenSupabase } from './supabaseStorage';

/** Resultado de resolver la URL de una imagen entrante (URL directa o archivo base64). */
export type ResultadoImagen = { url: string } | { error: string; message: string };

/** Decodifica un data URL base64. */
function parseDataUrl(data: string): { buffer: Buffer; contentType: string; ext: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(data);
  if (!match) return null;
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = (contentType.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  return { buffer, contentType, ext };
}

/**
 * HU033/HU035: resuelve la URL de una imagen de catálogo. Si viene por `url`
 * se usa tal cual; si viene en `data` (base64) se sube a Supabase Storage.
 * `carpeta` agrupa los archivos (id del producto o del modelo).
 */
export async function resolverUrlImagen(
  input: { url?: string; data?: string },
  carpeta: string
): Promise<ResultadoImagen> {
  let url = input.url ?? '';
  if (!url && input.data) {
    if (!supabaseConfigurado()) {
      return {
        error: 'STORAGE_NOT_CONFIGURED',
        message: 'La subida de archivos no está configurada. Pega una URL de imagen.',
      };
    }
    const parsed = parseDataUrl(input.data);
    if (!parsed) return { error: 'INVALID_FILE', message: 'El archivo enviado no es válido' };
    try {
      // Sonar S2245: el sufijo debe ser impredecible (nombre de objeto en Storage).
      const sufijo = randomBytes(6).toString('hex');
      const nombre = `${carpeta}/${Date.now()}-${sufijo}.${parsed.ext}`;
      url = await subirImagenSupabase(parsed.buffer, parsed.contentType, nombre);
    } catch (error) {
      return {
        error: 'STORAGE_ERROR',
        message: error instanceof Error ? error.message : 'No se pudo subir la imagen',
      };
    }
  }
  if (!url) return { error: 'INVALID_URL', message: 'Debes indicar una URL o un archivo' };
  return { url };
}
