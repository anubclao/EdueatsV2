import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import pool from '../db/pool.js';

const SESSION_COOKIE = 'edueats_session';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      authSessionToken?: string;
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

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

export const setSessionCookie = (res: Response, token: string, maxAgeMs: number) => {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    const tokenHash = hashToken(token);
    const now = Date.now();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, u.email_verified as emailVerified
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

    req.authUser = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role,
      emailVerified: Boolean(rows[0].emailVerified),
    };
    req.authSessionToken = token;

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
