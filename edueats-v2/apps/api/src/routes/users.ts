import { randomBytes } from 'crypto';
import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { enqueueEmail, enqueueNotification } from '../services/queue.js';
import { notifyAdmins, notifyUser } from '../services/websocket.js';

const genToken = () => randomBytes(16).toString('hex');
const getAppBaseUrl = () => {
  const raw = process.env.APP_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  return raw.split(',')[0].trim().replace(/\/+$/, '');
};

const mapUser = (u: any) => u ? ({
  ...u,
  emailVerified: Boolean(u.email_verified ?? u.emailVerified),
  email_verified: undefined,
  verification_token: undefined,
  token_expires_at: undefined,
  verificationToken: undefined,
  tokenExpiresAt: undefined,
}) : null;

export const usersRouter = Router();

// GET /
usersRouter.get('/', requireAuth, requireRoles('admin'), async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users') as any[];
    res.json(rows.map(mapUser));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /email/:email
usersRouter.get('/email/:email', requireAuth, async (req, res) => {
  try {
    const requestedEmail = String(req.params.email).toLowerCase();
    const isAdmin = req.authUser?.role === 'admin';
    const isSelf = req.authUser?.email.toLowerCase() === requestedEmail;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const [rows] = await pool.execute('SELECT * FROM users WHERE email=?', [req.params.email]) as any[];
    res.json(rows.length ? mapUser(rows[0]) : null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /register
usersRouter.post('/register', async (req, res) => {
  const { id, name, email, phone, role, grade, section, allergies } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email=?', [email]) as any[];
    if (existing.length > 0) return res.json({ success: false, token: '' });
    const token = genToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await pool.execute(
      'INSERT INTO users (id, name, email, phone, role, grade, section, allergies, email_verified, verification_token, token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [id, name, email, phone ?? null, role, grade ?? null, section ?? null, allergies ?? null, token, expiresAt]
    );

    const verifyLink = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const html = `
      <h2>Bienvenido a EduEats</h2>
      <p>Hola ${name}, para validar tu correo haz clic aqui:</p>
      <p><a href="${verifyLink}">Verificar mi correo</a></p>
      <p>El enlace vence en 24 horas.</p>
    `;

    void enqueueEmail('notification', {
      userId: id,
      email,
      subject: 'Verifica tu cuenta de EduEats',
      html,
      message: `Verifica tu cuenta aqui: ${verifyLink}`,
    });

    void enqueueNotification('custom', {
      userId: id,
      type: 'registration-created',
      message: 'Tu registro fue creado. Revisa tu correo para verificar la cuenta.',
      createdAt: Date.now(),
    });

    notifyAdmins('users:pending-verification', {
      userId: id,
      name,
      email,
      role,
      at: Date.now(),
    });

    res.json({ success: true, token });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /:id
usersRouter.put('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  const { name, email, phone, role, grade, section, allergies, emailVerified } = req.body;
  try {
    const [dup] = await pool.execute('SELECT id FROM users WHERE email=? AND id!=?', [email, req.params.id]) as any[];
    if (dup.length > 0) return res.json({ success: false, message: 'El correo electrónico ya está en uso por otro usuario.' });
    await pool.execute(
      'UPDATE users SET name=?, email=?, phone=?, role=?, grade=?, section=?, allergies=?, email_verified=? WHERE id=?',
      [name, email, phone ?? null, role, grade ?? null, section ?? null, allergies ?? null, emailVerified ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id
usersRouter.delete('/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /verify
usersRouter.post('/verify', async (req, res) => {
  const { token } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE verification_token=?', [token]) as any[];
    if (!rows.length) return res.json({ status: 'invalid' });
    if (rows[0].token_expires_at && Date.now() > Number(rows[0].token_expires_at))
      return res.json({ status: 'expired' });
    await pool.execute(
      'UPDATE users SET email_verified=1, verification_token=NULL, token_expires_at=NULL WHERE id=?',
      [rows[0].id]
    );

    void enqueueNotification('custom', {
      userId: rows[0].id,
      type: 'account-verified',
      message: 'Tu cuenta fue verificada correctamente.',
      createdAt: Date.now(),
    });

    notifyUser(rows[0].id, 'users:verified', {
      userId: rows[0].id,
      email: rows[0].email,
      at: Date.now(),
    });

    res.json({ status: 'success' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /resend-verification
usersRouter.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await pool.execute('SELECT id FROM users WHERE email=?', [email]) as any[];
    if (!rows.length) return res.json({ success: false });
    const token = genToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await pool.execute('UPDATE users SET verification_token=?, token_expires_at=? WHERE id=?',
      [token, expiresAt, rows[0].id]);

    const verifyLink = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const html = `
      <h2>Nuevo enlace de verificacion</h2>
      <p>Solicitaste un nuevo enlace para verificar tu cuenta:</p>
      <p><a href="${verifyLink}">Verificar mi correo</a></p>
      <p>El enlace vence en 24 horas.</p>
    `;

    void enqueueEmail('notification', {
      userId: rows[0].id,
      email,
      subject: 'Nuevo enlace de verificacion - EduEats',
      html,
      message: `Nuevo enlace: ${verifyLink}`,
    });

    console.log(`[users] Nuevo token de verificacion para ${email}: ${token}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
