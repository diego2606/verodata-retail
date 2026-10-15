import type { DeltaVariantesPayload, VarianteDraft } from '../../../types/productModel.types';

/**
 * Compara el estado original (persistido) con el actual y devuelve SOLO el delta
 * (HU035 CA08). El SKU y los atributos nunca viajan en `actualizar_variantes`.
 */
export function calcularDelta(
  originales: VarianteDraft[],
  actuales: VarianteDraft[]
): DeltaVariantesPayload {
  const payload: DeltaVariantesPayload = {
    nuevas_variantes: [],
    actualizar_variantes: [],
    eliminar_variantes: [],
  };

  const originalesPorId = new Map(originales.map((o) => [o.id, o]));

  for (const v of actuales) {
    if (v.id === null) {
      // Filas nuevas pendientes: se descartan las que el operador "eliminó" antes de guardar.
      if (v.estado === 'eliminada') continue;
      payload.nuevas_variantes.push({
        atributos: v.atributos,
        ...(v.sku ? { sku: v.sku } : {}),
        codigo_barras: v.codigo_barras,
        precio_regular: v.precio_regular,
        precio_oferta: v.precio_oferta,
        stock_actual: v.stock_actual,
        stock_minimo: v.stock_minimo,
      });
      continue;
    }

    if (v.estado === 'eliminada') {
      payload.eliminar_variantes.push(v.id);
      continue;
    }

    const original = originalesPorId.get(v.id);
    if (!original) continue;

    const cambio =
      v.dirty.precio || v.dirty.stock || v.dirty.estadoActivo || v.dirty.barcode;
    if (!cambio) continue;

    payload.actualizar_variantes.push({
      sku_id: v.id,
      ...(v.dirty.precio
        ? { precio_regular: v.precio_regular, precio_oferta: v.precio_oferta }
        : {}),
      ...(v.dirty.stock
        ? { stock_actual: v.stock_actual, stock_minimo: v.stock_minimo }
        : {}),
      ...(v.dirty.barcode ? { codigo_barras: v.codigo_barras } : {}),
      ...(v.dirty.estadoActivo ? { activo: v.activo } : {}),
    });
  }

  return payload;
}

/** true si el delta no contiene cambios. */
export function deltaVacio(delta: DeltaVariantesPayload): boolean {
  return (
    delta.nuevas_variantes.length === 0 &&
    delta.actualizar_variantes.length === 0 &&
    delta.eliminar_variantes.length === 0
  );
}
