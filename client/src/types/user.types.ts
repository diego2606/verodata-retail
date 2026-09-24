export type RolUsuario = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENTE';

export type TipoDocumento = 'DNI' | 'PASAPORTE' | 'CARNET_EXTRANJERIA';

/** Fila devuelta por GET /api/v1/users */
export interface UsuarioListItem {
  id: string;
  email: string;
  rol: RolUsuario;
  bloqueado: boolean;
  intentos_fallidos: number;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  creado_en: string;
}

/** Rol del catálogo GET /api/v1/roles */
export interface RolOption {
  id: number;
  nombre: RolUsuario;
}

/** Contrato de POST /api/v1/users — datos divididos en 3FN (HU002) */
export interface CrearUsuarioPayload {
  id_rol: number;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono?: string;
}
