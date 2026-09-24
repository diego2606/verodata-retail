/**
 * Subida de imágenes a Supabase Storage (bucket `productos`), mismo patrón
 * que el importador de Mercado Libre (HU033).
 */

const BUCKET = process.env.SUPABASE_BUCKET ?? 'productos';

export function supabaseConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function baseUrl(): string {
  return (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
}

/** Sube un buffer y devuelve la URL pública. Lanza si no está configurado o falla. */
export async function subirImagenSupabase(
  buffer: Buffer,
  contentType: string,
  nombreArchivo: string
): Promise<string> {
  const base = baseUrl();
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    throw new Error('Supabase Storage no está configurado (SUPABASE_URL / SUPABASE_SERVICE_KEY)');
  }
  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${nombreArchivo}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Storage ${res.status}`);
  return `${base}/storage/v1/object/public/${BUCKET}/${nombreArchivo}`;
}
