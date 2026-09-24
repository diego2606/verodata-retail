import type { SelectOption } from '../components/ui/Select';
import type { CategoriaItem } from '../types/category.types';

/**
 * HU025/HU029: arma las opciones de un selector de categorías respetando la
 * jerarquía (padre antes que hijos, hijos indentados) para distinguir
 * categorías de subcategorías.
 */
export function opcionesCategoriaJerarquicas(categorias: CategoriaItem[]): SelectOption[] {
  const hijos = new Map<number | null, CategoriaItem[]>();
  for (const c of categorias) {
    const key = c.categoria_padre_id ?? null;
    const arr = hijos.get(key) ?? [];
    arr.push(c);
    hijos.set(key, arr);
  }

  const out: SelectOption[] = [];
  const visitados = new Set<number>();
  const recorrer = (padreId: number | null, depth: number): void => {
    const orden = (hijos.get(padreId) ?? [])
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    for (const c of orden) {
      if (visitados.has(c.id)) continue;
      visitados.add(c.id);
      out.push({ value: String(c.id), label: `${'— '.repeat(depth)}${c.nombre}` });
      recorrer(c.id, depth + 1);
    }
  };
  recorrer(null, 0);

  // Huérfanos (padre fuera del listado filtrado) al final, sin indentar.
  for (const c of categorias) {
    if (!visitados.has(c.id)) out.push({ value: String(c.id), label: c.nombre });
  }
  return out;
}

/** Ruta legible de una categoría: "Ropa › Zapatillas › Running" (HU030). */
export function rutaCategoria(categorias: CategoriaItem[], id: number | null): string {
  if (id === null) return '';
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const partes: string[] = [];
  const visitados = new Set<number>();
  let actual = porId.get(id);
  while (actual && !visitados.has(actual.id)) {
    visitados.add(actual.id);
    partes.unshift(actual.nombre);
    actual = actual.categoria_padre_id !== null ? porId.get(actual.categoria_padre_id) : undefined;
  }
  return partes.join(' › ');
}
