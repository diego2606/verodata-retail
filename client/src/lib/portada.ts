/**
 * Helpers de la portada del Storefront (HU034/HU013).
 *
 * Lógica pura y sin dependencias de React: iconos de departamento y lectura
 * defensiva de la franja de confianza que llega como JSONB desde `sitio_config`.
 */
import {
  Backpack,
  Dumbbell,
  Footprints,
  GraduationCap,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tag,
  Watch,
  type LucideIcon,
} from 'lucide-react';
import { normalizarTexto } from './utils';
import type { FranjaConfianza } from '../types/banner.types';

export type { FranjaConfianza };

// ─── Franja de confianza ──────────────────────────────────────────────────────

/** Respaldo cuando `sitio_config.franja_confianza` está vacío o corrupto. */
export const FRANJA_DEFECTO: FranjaConfianza[] = [
  { titulo: 'Envíos a todo el Perú', texto: 'Despacho en 24–48 horas.' },
  { titulo: 'Cambios sin costo', texto: 'Hasta 30 días después de tu compra.' },
  { titulo: 'Yape y Plin', texto: 'Pagos móviles al instante.' },
  { titulo: 'Compra en cuotas', texto: 'Con tarjetas participantes.' },
];

function esFranja(valor: unknown): valor is FranjaConfianza {
  return typeof valor === 'object' && valor !== null && 'titulo' in valor && 'texto' in valor;
}

/**
 * Normaliza el valor crudo de `franja_confianza` (JSONB no confiable).
 * Devuelve `[]` si no hay ítems válidos; el consumidor decide el respaldo.
 */
export function leerFranja(valor: unknown): FranjaConfianza[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter(esFranja)
    .map((item) => ({ titulo: String(item.titulo), texto: String(item.texto) }))
    .filter((item) => item.titulo.trim().length > 0);
}

// ─── Iconos de departamento ───────────────────────────────────────────────────

interface ReglaIcono {
  claves: string[];
  icono: LucideIcon;
}

/** Palabras clave por departamento → icono. El orden importa (primera coincidencia). */
const REGLAS_ICONO: ReglaIcono[] = [
  { claves: ['calzado', 'zapato', 'zapatilla', 'sneaker', 'sandalia'], icono: Footprints },
  { claves: ['ropa', 'polera', 'camisa', 'polo', 'blusa', 'pantalon', 'casaca', 'chaqueta'], icono: Shirt },
  { claves: ['mochila', 'bolso', 'cartera', 'maleta'], icono: Backpack },
  { claves: ['colegial', 'escolar', 'universidad', 'utiles'], icono: GraduationCap },
  { claves: ['reloj', 'joya', 'bisuter'], icono: Watch },
  { claves: ['tecnolog', 'electron', 'celular', 'comput'], icono: Smartphone },
  { claves: ['deporte', 'fitness', 'gimnasio', 'entrena'], icono: Dumbbell },
  { claves: ['accesorio', 'gorra', 'sombrero', 'lente'], icono: ShoppingBag },
];

/** Icono del departamento según su nombre. `Tag` como respaldo genérico. */
export function iconoDepartamento(nombre: string): LucideIcon {
  const buscado = normalizarTexto(nombre);
  const regla = REGLAS_ICONO.find((r) => r.claves.some((clave) => buscado.includes(clave)));
  return regla?.icono ?? Tag;
}
