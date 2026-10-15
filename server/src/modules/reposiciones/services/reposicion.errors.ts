/**
 * Errores de dominio de la recepción de una orden (HU036).
 * El repositorio los lanza dentro de la transacción y el servicio los mapea a la API;
 * así el `ROLLBACK` ocurre antes de que el error salga de la capa de datos.
 */

/** La orden solicitada no existe. */
export class OrdenNoEncontradaError extends Error {
  constructor(readonly ordenId: string) {
    super('La orden de reposición no existe');
    this.name = 'OrdenNoEncontradaError';
  }
}

/** La orden ya fue recibida o cancelada: no admite una nueva recepción. */
export class OrdenNoPendienteError extends Error {
  constructor(readonly estado: string) {
    super(`La orden está en estado ${estado} y no puede recibirse`);
    this.name = 'OrdenNoPendienteError';
  }
}

/** Un SKU de la orden no tiene fila en `inventario` (no se puede sumar stock). */
export class ProductoSinInventarioError extends Error {
  constructor(readonly productoId: string) {
    super('Uno de los productos de la orden no tiene registro de inventario');
    this.name = 'ProductoSinInventarioError';
  }
}
