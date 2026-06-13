import { createHash, randomBytes, randomInt } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { clearSessionCookie, hashToken, requireAuth, revokeSessionByToken, setSessionCookie } from '../middleware/auth.js';
import { sendOtpEmail } from '../services/email.js';
import { enqueueEmail, enqueueNotification } from '../services/queue.js';
import { getBogotaEndOfDayMs } from '../services/timezone.js';
import { notifyUser } from '../services/websocket.js';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const OTP_TTL_MINUTES = Math.min(
  10,
  Math.max(5, parsePositiveInt(process.env.OTP_EXPIRES_MINUTES, 5))
);
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
const OTP_RATE_LIMIT_MAX = parsePositiveInt(process.env.OTP_RATE_LIMIT_MAX, 3);
const OTP_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.OTP_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);

type OtpRateBucket = {
  count: number;
  resetAt: number;
};

const otpRateBuckets = new Map<string, OtpRateBucket>();

const rateLimitKeyFromIdentifier = (identifier: string, userEmail?: string) => {
  const source = (userEmail ?? identifier).trim().toLowerCase();
  return source.includes('@') ? `email:${source}` : `id:${source}`;
};

const consumeOtpRateLimit = (key: string) => {
  const now = Date.now();
  const bucket = otpRateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    otpRateBuckets.set(key, { count: 1, resetAt: now + OTP_RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= OTP_RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }

  bucket.count += 1;
  otpRateBuckets.set(key, bucket);
  return { allowed: true, retryAfterMs: 0 };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of otpRateBuckets.entries()) {
    if (now >= bucket.resetAt) otpRateBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

const startSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
});

const verifySchema = z.object({
  challengeId: z.string().trim().min(12).max(80),
  otp: z.string().trim().regex(/^\d{6}$/),
});

const hashOtp = (otp: string, salt: string) => createHash('sha256').update(`${salt}:${otp}`).digest('hex');

const ensureAuthTables = async () => {
  // Verificar si las tablas ya existen antes de intentar crearlas
  const [existingTables] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('auth_otp_challenges', 'auth_sessions')`
  ) as any[];

  const existing = new Set((existingTables as any[]).map((r: any) => r.TABLE_NAME));

  if (!existing.has('auth_otp_challenges')) {
    await pool.query(`
      CREATE TABLE auth_otp_challenges (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[auth] Tabla auth_otp_challenges creada');
  }

  if (!existing.has('auth_sessions')) {
    await pool.query(`
      CREATE TABLE auth_sessions (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[auth] Tabla auth_sessions creada');
  }
};

// Permite reintentar si la promesa inicial falló (ej: BD no lista al arrancar)
let authTablesReadyPromise: Promise<void> | null = null;

const getAuthTablesReady = () => {
  if (!authTablesReadyPromise) {
    authTablesReadyPromise = ensureAuthTables().catch((err) => {
      authTablesReadyPromise = null; // permite reintentar en la próxima petición
      throw err;
    });
  }
  return authTablesReadyPromise;
};

// Inicializar en arranque (fallo no es fatal — se reintenta en cada request)
getAuthTablesReady().catch((err) =>
  console.error('[auth] Error inicializando tablas (se reintentará):', err?.message ?? err)
);

const waitAuthTables = async (res: any) => {
  try {
    await getAuthTablesReady();
    return true;
  } catch (error: any) {
    console.error('[auth] Error inicializando tablas de autenticacion:', error?.message ?? error);
    res.status(500).json({
      success: false,
      message: `No se pudo inicializar el servicio de autenticacion: ${error?.message ?? 'Error de base de datos'}`,
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
  schoolId: u.school_id ?? u.schoolId ?? 'default',
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
      'SELECT id, name, email, email_verified FROM users WHERE email=? OR id=? LIMIT 1',
      [identifier, identifier]
    ) as any[];

    const user = rows[0] ?? null;
    const rateLimitKey = rateLimitKeyFromIdentifier(identifier, user?.email);
    const rateLimitState = consumeOtpRateLimit(rateLimitKey);

    if (!rateLimitState.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes de codigo. Intenta nuevamente en unos minutos.',
        retryAfterSeconds: Math.ceil(rateLimitState.retryAfterMs / 1000),
      });
    }

    if (user && !Boolean(user.email_verified)) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta aun no ha sido autorizada por el administrador del colegio.',
      });
    }

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
      if (process.env.NODE_ENV !== 'development') {
        try {
          const queued = await enqueueEmail('verification', {
            userId: user.id,
            email: user.email,
            name: user.name ?? user.email,
            code: otp,
            ttlMinutes: OTP_TTL_MINUTES,
          });

          if (!queued) {
            const sent = await sendOtpEmail(user.email, user.name ?? user.email, otp, OTP_TTL_MINUTES);
            if (!sent) {
              return res.status(503).json({
                success: false,
                message: 'No pudimos enviar el codigo al correo. Contacta al administrador.',
              });
            }
          }
        } catch (emailErr: any) {
          console.error('[auth] Error enviando email OTP:', emailErr?.message);
          return res.status(502).json({
            success: false,
            message: 'No pudimos enviar el codigo al correo. Intenta nuevamente en unos minutos.',
          });
        }
      }
    }

    return res.json({
      success: true,
      challengeId,
      message: 'Si el usuario existe, enviamos un codigo de acceso.',
      // devOtp SOLO se filtra cuando NODE_ENV=development de forma explícita.
      // NUNCA cuando NODE_ENV=production o sin NODE_ENV (fail-closed).
      devOtp: process.env.NODE_ENV === 'development' && !!user ? otp : undefined,
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
    const expiresAt = getBogotaEndOfDayMs(now);
    const sessionTtlMs = Math.max(1, expiresAt - now);

    await pool.execute('UPDATE auth_otp_challenges SET consumed_at=? WHERE id=?', [now, challengeId]);
    await pool.execute(
      `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, revoked_at, created_at, ip, user_agent)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      [sessionId, challenge.user_id, tokenHash, expiresAt, now, req.ip ?? null, (req.headers['user-agent'] ?? '').slice(0, 255)]
    );

    const userPayload = toUserResponse(users[0]);

    void enqueueNotification('custom', {
      userId: userPayload.id,
      type: 'auth-login',
      message: 'Has iniciado sesion correctamente.',
      createdAt: now,
    });

    notifyUser(userPayload.id, 'auth:login', {
      ok: true,
      at: now,
    });

    setSessionCookie(res, sessionToken, sessionTtlMs);

    return res.json({ success: true, user: userPayload });
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
