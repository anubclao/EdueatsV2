import { Router } from 'express';
import { randomBytes } from 'crypto';
import pool from '../db.js';

const router = Router();

const genToken = () => randomBytes(16).toString('hex');

const mapUser = (u) => u ? ({
  ...u,
  emailVerified: Boolean(u.email_verified ?? u.emailVerified),
  email_verified: undefined,
  verification_token: undefined,
  token_expires_at: undefined,
  verificationToken: u.verification_token ?? u.verificationToken,
  tokenExpiresAt: u.token_expires_at ?? u.tokenExpiresAt,
}) : null;

// GET /
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows.map(mapUser));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /email/:email
router.get('/email/:email', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email=?', [req.params.email]);
    res.json(rows.length ? mapUser(rows[0]) : null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /register
router.post('/register', async (req, res) => {
  const { id, name, email, phone, role, grade, section, allergies } = req.body;
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length > 0) return res.json({ success: false, token: '' });

    const token    = genToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await pool.execute(
      'INSERT INTO users (id, name, email, phone, role, grade, section, allergies, email_verified, verification_token, token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [id, name, email, phone || null, role, grade || null, section || null, allergies || null, token, expiresAt]
    );
    res.json({ success: true, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /:id
router.put('/:id', async (req, res) => {
  const { name, email, phone, role, grade, section, allergies, emailVerified } = req.body;
  try {
    const [dup] = await pool.execute('SELECT id FROM users WHERE email=? AND id!=?', [email, req.params.id]);
    if (dup.length > 0) return res.json({ success: false, message: 'El correo electrónico ya está en uso por otro usuario.' });

    await pool.execute(
      'UPDATE users SET name=?, email=?, phone=?, role=?, grade=?, section=?, allergies=?, email_verified=? WHERE id=?',
      [name, email, phone || null, role, grade || null, section || null, allergies || null, emailVerified ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /verify
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE verification_token=?', [token]);
    if (!rows.length) return res.json({ status: 'invalid' });
    if (rows[0].token_expires_at && Date.now() > Number(rows[0].token_expires_at))
      return res.json({ status: 'expired' });

    await pool.execute(
      'UPDATE users SET email_verified=1, verification_token=NULL, token_expires_at=NULL WHERE id=?',
      [rows[0].id]
    );
    res.json({ status: 'success' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await pool.execute('SELECT id, name FROM users WHERE email=?', [email]);
    if (!rows.length) return res.json({ success: false });

    const token    = genToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    await pool.execute('UPDATE users SET verification_token=?, token_expires_at=? WHERE id=?',
      [token, expiresAt, rows[0].id]);
    res.json({ success: true, token, name: rows[0].name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
