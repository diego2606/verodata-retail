/** Tipos de la cuenta de cliente (registro, perfil y direcciones). */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENTE';
export type TipoDocumento = 'DNI' | 'PASAPORTE' | 'CARNET_EXTRANJERIA';

export interface RegistroClientePayload {
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface LoginClienteResult {
  token: string;
  usuario: { id: string; email: string; rol: UserRole; nombre: string | null };
}

export interface RecuperarResult {
  token: string | null;
  expira_en: string | null;
}

export interface PerfilCliente {
  id: string;
  email: string;
  rol: UserRole;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  creado_en: string;
  /** Candado del checkout: true cuando tiene documento de identidad. */
  perfil_completo: boolean;
}

export interface ActualizarPerfilPayload {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
}

export interface CambiarPasswordPayload {
  password_actual: string;
  password_nueva: string;
}

export interface DireccionItem {
  id: string;
  usuario_id: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion_linea: string;
  referencia: string | null;
  codigo_postal: string | null;
  /** Ubicación exacta elegida en el mapa (migración 012). `null` si no se usó. */
  latitud: number | null;
  longitud: number | null;
  es_principal: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface DireccionPayload {
  departamento: string;
  provincia: string;
  distrito: string;
  direccion_linea: string;
  referencia?: string | null;
  codigo_postal?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  es_principal?: boolean;
}
