import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import pool from '../db/pool.js';
import { getBogotaStartOfDayMs } from '../services/timezone.js';

const SESSION_COOKIE = 'edueats_session';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  schoolId: string;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      authSessionToken?: string;
      /**
       * Identificador del colegio activo para el request.
       * Derivado de la sesión del usuario. Todas las queries tenant-scoped
       * deben usar este valor (o `scopedQuery`).
       */
      schoolId?: string;
    }
  }
}

const parseCookie = (cookieHeader: string | undefined, key: string) => {
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(';');
  for (const chunk of chunks) {
    const [rawKey, ...rest] = chunk.trim().split('=');
    if (rawKey !== key) continue;
    return decodeURIComponent(rest.join('='));
  }
  return null;
};

/**
 * Hash de token con HMAC-SHA256, keyed con SESSION_SECRET.
 * Esto previene que un dump de la BD permita verificar tokens: para calcular
 * un hash válido, un atacante necesitaría además el secret del servidor.
 *
 * Si SESSION_SECRET no está definido, derivamos uno de un fallback solo-dev
 * (que ahora SÍ se exige en producción — ver sessions.ts).
 */
const HASH_SECRET = process.env.SESSION_SECRET?.trim() || 'dev-only-insecure-hmac-fallback';

export const hashToken = (value: string) =>
  createHash('sha256').update(value).update('|').update(HASH_SECRET).digest('hex');

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_NAME = isProduction ? '__Host-edueats_session' : SESSION_COOKIE;

export const setSessionCookie = (res: Response, token: string, maxAgeMs: number) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Soportar tanto el nombre dev como el de prod (con __Host- prefix).
    const token = parseCookie(req.headers.cookie, COOKIE_NAME)
      ?? (isProduction ? null : parseCookie(req.headers.cookie, SESSION_COOKIE));
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    const tokenHash = hashToken(token);
    const now = Date.now();
    const startOfTodayMs = getBogotaStartOfDayMs(now);

    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, u.email_verified as emailVerified, u.school_id as schoolId
       FROM auth_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash=?
         AND s.revoked_at IS NULL
         AND s.expires_at > ?
         AND s.created_at >= ?
       LIMIT 1`,
      [tokenHash, now, startOfTodayMs]
    ) as any[];

    if (!rows.length) return res.status(401).json({ error: 'Sesion invalida' });

    const schoolId = rows[0].schoolId || 'default';

    req.authUser = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role,
      emailVerified: Boolean(rows[0].emailVerified),
      schoolId,
    };
    req.authSessionToken = token;
    req.schoolId = schoolId;

    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.authUser.role)) return res.status(403).json({ error: 'Sin permisos' });
    next();
  };
};

export const revokeSessionByToken = async (token: string) => {
  const tokenHash = hashToken(token);
  await pool.execute('UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL', [Date.now(), tokenHash]);
};
