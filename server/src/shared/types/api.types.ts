export interface ApiError {
  code: string;
  message: string;
  details: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiError;
}

/** Envelope estándar de la API (03-guidelines §3). */
export type ApiResponse<T = null> = ApiSuccess<T> | ApiFailure;

export interface JwtPayload {
  id_usuario: string;
  email: string;
  rol: 'SUPER_ADMIN' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export type RolUsuario = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENTE';

export type TipoDocumento = 'DNI' | 'PASAPORTE' | 'CARNET_EXTRANJERIA';
