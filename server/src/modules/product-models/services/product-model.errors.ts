/** Errores de dominio del delta de variantes (HU035). El controller los mapea a 400. */

export class VarianteDuplicadaError extends Error {
  constructor(readonly combinacion: Record<string, string>) {
    super('Esa combinación de atributos ya existe para este producto.');
    this.name = 'VarianteDuplicadaError';
  }
}

export class AtributoInvalidoError extends Error {
  constructor(readonly atributos: string[], readonly permitidos: string[]) {
    super(`Atributos no permitidos para esta categoría: ${atributos.join(', ')}`);
    this.name = 'AtributoInvalidoError';
  }
}

export class AtributoFaltanteError extends Error {
  constructor(readonly faltantes: string[]) {
    super(`Completa los ejes de variante: ${faltantes.join(', ')}`);
    this.name = 'AtributoFaltanteError';
  }
}

export class VarianteAjenaError extends Error {
  constructor(readonly skuId: string) {
    super(`La variante ${skuId} no pertenece a este producto`);
    this.name = 'VarianteAjenaError';
  }
}

export class SkuRequeridoError extends Error {
  constructor() {
    super('El SKU es obligatorio para esta categoría');
    this.name = 'SkuRequeridoError';
  }
}
