import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, RolUsuario } from '../shared/types/api.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token de autenticación requerido', data: null });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado', data: null });
  }
}

export function authorize(...roles: RolUsuario[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado', data: null });
      return;
    }
    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ success: false, message: 'Acceso prohibido: permisos insuficientes', data: null });
      return;
    }
    next();
  };
}
