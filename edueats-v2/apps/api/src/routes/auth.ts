import { createHash, randomBytes, randomInt } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { clearSessionCookie, hashToken, requireAuth, revokeSessionByToken, setSessionCookie } from '../middleware/auth.js';
import { sendOtpEmail } from '../services/email.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const startSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
});

const verifySchema = z.object({
  challengeId: z.string().trim().min(12).max(80),
  otp: z.string().trim().regex(/^\d{6}$/),
});

const hashOtp = (otp: string, salt: string) => createHash('sha256').update(`${salt}:${otp}`).digest('hex');

const ensureAuthTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_otp_challenges (
      id VARCHAR(80) PRIMARY KEY,
      user_id VARCHAR(191) NULL,
      salt VARCHAR(64) NOT NULL,
      otp_hash VARCHAR(128) NOT NULL,
      expires_at BIGINT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      consumed_at BIGINT NULL,
      created_at BIGINT NOT NULL,
      ip VARCHAR(120) NULL,
      user_agent VARCHAR(255) NULL,
      INDEX idx_auth_otp_user_created (user_id, created_at),
      INDEX idx_auth_otp_expires (expires_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id VARCHAR(80) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      token_hash VARCHAR(128) NOT NULL,
      expires_at BIGINT NOT NULL,
      revoked_at BIGINT NULL,
      created_at BIGINT NOT NULL,
      ip VARCHAR(120) NULL,
      user_agent VARCHAR(255) NULL,
      UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
      INDEX idx_auth_sessions_user (user_id, revoked_at),
      INDEX idx_auth_sessions_expires (expires_at)
    )
  `);
};

const authTablesReady = ensureAuthTables();

const waitAuthTables = async (res: any) => {
  try {
    await authTablesReady;
    return true;
  } catch (error: any) {
    console.error('[auth] Error inicializando tablas de autenticacion:', error?.message ?? error);
    res.status(500).json({
      success: false,
      message: 'No se pudo inicializar el servicio de autenticacion. Revisa permisos de base de datos.',
    });
    return false;
  }
};

const toUserResponse = (u: any) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  grade: u.grade,
  section: u.section,
  allergies: u.allergies,
  phone: u.phone,
  emailVerified: Boolean(u.email_verified ?? u.emailVerified),
});

export const authRouter = Router();

authRouter.post('/start', async (req, res) => {
  if (!(await waitAuthTables(res))) return;

  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Solicitud invalida' });
  }

  const identifier = parsed.data.identifier.trim();

  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email FROM users WHERE email=? OR id=? LIMIT 1',
      [identifier, identifier]
    ) as any[];

    const user = rows[0] ?? null;
    const challengeId = randomBytes(20).toString('hex');
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const salt = randomBytes(12).toString('hex');
    const createdAt = Date.now();
    const expiresAt = createdAt + OTP_TTL_MS;

    await pool.execute(
      `INSERT INTO auth_otp_challenges
       (id, user_id, salt, otp_hash, expires_at, attempts, max_attempts, consumed_at, created_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, 0, 5, NULL, ?, ?, ?)`,
      [
        challengeId,
        user?.id ?? null,
        salt,
        hashOtp(user ? otp : randomBytes(8).toString('hex'), salt),
        expiresAt,
        createdAt,
        req.ip ?? null,
        (req.headers['user-agent'] ?? '').slice(0, 255),
      ]
    );

    if (user) {
      console.log(`[auth] OTP para ${user.email}: ${otp}`);
      try {
        const sent = await sendOtpEmail(user.email, user.name ?? user.email, otp, OTP_TTL_MS / 60_000);
        if (!sent) {
          return res.status(503).json({
            success: false,
            message: 'No pudimos enviar el codigo al correo. Contacta al administrador.',
          });
        }
      } catch (emailErr: any) {
        console.error('[auth] Error enviando email OTP:', emailErr?.message);
        return res.status(502).json({
          success: false,
          message: 'No pudimos enviar el codigo al correo. Intenta nuevamente en unos minutos.',
        });
      }
    }

    return res.json({
      success: true,
      challengeId,
      message: 'Si el usuario existe, enviamos un codigo de acceso.',
      devOtp: process.env.NODE_ENV === 'production' || !user ? undefined : otp,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

authRouter.post('/verify-otp', async (req, res) => {
  if (!(await waitAuthTables(res))) return;

  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Solicitud invalida' });
  }

  const { challengeId, otp } = parsed.data;

  try {
    const [rows] = await pool.execute(
      `SELECT id, user_id, salt, otp_hash, expires_at, attempts, max_attempts, consumed_at
       FROM auth_otp_challenges
       WHERE id=?
       LIMIT 1`,
      [challengeId]
    ) as any[];

    if (!rows.length) return res.status(401).json({ success: false, message: 'Codigo invalido' });

    const challenge = rows[0];
    const now = Date.now();

    if (challenge.consumed_at || now > Number(challenge.expires_at) || Number(challenge.attempts) >= Number(challenge.max_attempts)) {
      return res.status(401).json({ success: false, message: 'Codigo invalido o expirado' });
    }

    const expectedHash = hashOtp(otp, String(challenge.salt));
    const isValid = expectedHash === challenge.otp_hash;

    if (!isValid) {
      await pool.execute('UPDATE auth_otp_challenges SET attempts = attempts + 1 WHERE id=?', [challengeId]);
      return res.status(401).json({ success: false, message: 'Codigo invalido o expirado' });
    }

    if (!challenge.user_id) {
      await pool.execute('UPDATE auth_otp_challenges SET consumed_at=? WHERE id=?', [now, challengeId]);
      return res.status(401).json({ success: false, message: 'Codigo invalido o expirado' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE id=? LIMIT 1', [challenge.user_id]) as any[];
    if (!users.length) return res.status(401).json({ success: false, message: 'Codigo invalido o expirado' });

    const sessionToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(sessionToken);
    const sessionId = randomBytes(20).toString('hex');
    const expiresAt = now + SESSION_TTL_MS;

    await pool.execute('UPDATE auth_otp_challenges SET consumed_at=? WHERE id=?', [now, challengeId]);
    await pool.execute(
      `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, revoked_at, created_at, ip, user_agent)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      [sessionId, challenge.user_id, tokenHash, expiresAt, now, req.ip ?? null, (req.headers['user-agent'] ?? '').slice(0, 255)]
    );

    setSessionCookie(res, sessionToken, SESSION_TTL_MS);

    return res.json({ success: true, user: toUserResponse(users[0]) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id=? LIMIT 1', [req.authUser!.id]) as any[];
    if (!rows.length) return res.status(401).json({ error: 'No autenticado' });
    res.json(toUserResponse(rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  try {
    if (req.authSessionToken) {
      await revokeSessionByToken(req.authSessionToken);
    }
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
