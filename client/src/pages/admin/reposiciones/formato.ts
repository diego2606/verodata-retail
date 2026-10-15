const MONEDA = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

const FECHA = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

/** Monto en soles: `S/ 1,234.50`. */
export function formatearMonto(valor: number): string {
  return MONEDA.format(Number.isFinite(valor) ? valor : 0);
}

/** Fecha corta local (`12 oct 2026`); devuelve `—` si viene vacía. */
export function formatearFecha(iso: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '—' : FECHA.format(fecha);
}

/** Fecha límite (date-only) sin desfase de zona horaria. */
export function formatearFechaSoloDia(iso: string | null): string {
  if (!iso) return '—';
  const [anio, mes, dia] = iso.split('-');
  if (!anio || !mes || !dia) return iso;
  return FECHA.format(new Date(Number(anio), Number(mes) - 1, Number(dia)));
}

/** `#A1B2C3D4` — identificador corto y legible de una orden (UUID). */
export function idCorto(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

/** Atributos de variante en una línea: `COLOR: Negro · SIZE: 42`. */
export function formatearAtributos(atributos: Record<string, string>): string {
  return Object.entries(atributos)
    .map(([clave, valor]) => `${clave}: ${valor}`)
    .join(' · ');
}
