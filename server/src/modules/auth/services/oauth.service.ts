import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { authRepository } from '../repositories/auth.repository';
import { JwtPayload, RolUsuario } from '../../../shared/types/api.types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '8h') as string;

function redirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/v1/auth/google/callback';
}

export interface OAuthUsuario {
  id: string;
  email: string;
  rol: RolUsuario;
  nombre: string | null;
}

export function googleConfigurado(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

/**
 * OAuth 2.0 Authorization Code (Google) con validación de `state` y del ID token.
 * El usuario resultante usa el MISMO JWT propio del sistema (no hay contraseña).
 */
export const oauthService = {
  /** URL de autorización con `state` firmado (mitiga CSRF). */
  urlDeAutorizacion(): string {
    const state = jwt.sign({ nonce: randomBytes(16).toString('hex') }, JWT_SECRET, {
      expiresIn: '10m',
    });
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /** Canjea el `code`, valida el ID token y resuelve/crea el usuario. */
  async callback(code: string, state: string): Promise<{ token: string; usuario: OAuthUsuario }> {
    // 1. CSRF: el state debe ser un JWT firmado por nosotros y vigente.
    try {
      jwt.verify(state, JWT_SECRET);
    } catch {
      throw new Error('STATE_INVALID');
    }

    // 2. Canje del code por tokens (aquí se usa el client_secret).
    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri());
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new Error('NO_ID_TOKEN');

    // 3. Verificación de firma/audiencia/emisor del ID token.
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const perfil = ticket.getPayload();
    if (!perfil?.sub || !perfil.email) throw new Error('NO_EMAIL');
    if (perfil.email_verified === false) throw new Error('EMAIL_NOT_VERIFIED');

    // 4. Resolver el usuario (link OAuth → email existente → alta nueva).
    let usuarioId = await authRepository.buscarPorOAuth('google', perfil.sub);
    let rol: RolUsuario = 'CLIENTE';
    let nombre: string | null = perfil.name ?? null;

    if (!usuarioId) {
      const existente = await authRepository.findByEmail(perfil.email);
      if (existente) {
        usuarioId = existente.id;
        rol = existente.nombre_rol as RolUsuario;
        nombre = existente.nombres ?? nombre;
      } else {
        const rolId = await authRepository.obtenerRolIdPorNombre('CLIENTE');
        if (rolId === null) throw new Error('ROLE_NOT_FOUND');
        usuarioId = await authRepository.crearUsuarioSocial({
          email: perfil.email,
          nombres: perfil.given_name ?? perfil.name ?? perfil.email.split('@')[0],
          apellidos: perfil.family_name ?? '',
          rolId,
        });
      }
      await authRepository.vincularOAuth(usuarioId, 'google', perfil.sub);
    }

    // 5. Emitir el JWT propio del sistema.
    const payload: JwtPayload = { id_usuario: usuarioId, email: perfil.email, rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    return { token, usuario: { id: usuarioId, email: perfil.email, rol, nombre } };
  },

  /** URL de retorno al front, con el token en el fragmento (#). */
  urlDeExito(usuario: OAuthUsuario, token: string): string {
    const params = new URLSearchParams({
      token,
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre ?? '',
    });
    return `${CLIENT_URL}/cuenta/oauth#${params.toString()}`;
  },

  urlDeError(codigo: string): string {
    return `${CLIENT_URL}/cuenta/oauth#error=${encodeURIComponent(codigo)}`;
  },
};
