/**
 * Candado de perfil para el checkout (HU014).
 * Un perfil está completo cuando tiene documento de identidad; el pedido lo exige
 * para emitir boleta/factura.
 */
export interface DocumentoPerfil {
  tipo_documento: string | null;
  numero_documento: string | null;
}

export function perfilCompleto(perfil: DocumentoPerfil): boolean {
  return Boolean(perfil.tipo_documento && perfil.numero_documento);
}
