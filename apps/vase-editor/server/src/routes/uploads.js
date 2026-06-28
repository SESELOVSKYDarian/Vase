import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const uploadsRouter = Router();

const sanitizeUsername = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const resolveUploadsBaseUrl = () =>
  String(
    process.env.UPLOADS_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
    process.env.PUBLIC_UPLOADS_BASE_URL ||
    'https://uploads.vase.ar'
  ).replace(/\/+$/, '');

async function resolveUploadUser(req) {
  const tokenEmail = String(req.user?.email || '').trim().toLowerCase();
  const tokenUsername = sanitizeUsername(req.user?.username || (tokenEmail ? tokenEmail.split('@')[0] : ''));
  if (tokenUsername && tokenEmail) {
    return { email: tokenEmail, username: tokenUsername };
  }

  const result = await pool.query('select email, display_name from users where id = $1', [req.user.id]);
  const user = result.rows[0] || {};
  const email = String(user.email || tokenEmail || '').trim().toLowerCase();
  const username = sanitizeUsername(req.user?.username || user.display_name || (email ? email.split('@')[0] : req.user.id));

  return { email, username };
}

uploadsRouter.get('/token', async (req, res, next) => {
  try {
    const secret = process.env.UPLOADS_JWT_SECRET || '';
    if (!secret) {
      return res.status(500).json({ error: 'uploads_jwt_secret_missing' });
    }

    const uploadUser = await resolveUploadUser(req);
    if (!uploadUser.username) {
      return res.status(400).json({ error: 'upload_username_required' });
    }

    const token = jwt.sign(
      {
        sub: req.user.id,
        username: uploadUser.username,
        email: uploadUser.email,
        role: req.user.role || 'user',
        tenant_id: req.user.tenantId || null,
      },
      secret,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      uploads_base_url: resolveUploadsBaseUrl(),
      user: {
        id: req.user.id,
        username: uploadUser.username,
        email: uploadUser.email,
      },
    });
  } catch (err) {
    return next(err);
  }
});
