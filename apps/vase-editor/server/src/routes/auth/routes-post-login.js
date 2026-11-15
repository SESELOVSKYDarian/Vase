// Rutas de auth.js: post-bootstrap, post-login, post-exchange-vase, post-signup, post-register, post-request-login-code.
import bcrypt from 'bcryptjs';
import { pool } from '../../db.js';
import { signToken } from '../../middleware/auth.js';
import { normalizeEmailInput } from '../../services/mailer.js';
import { exchangeVaseLaunchToken } from '../../services/vaseBridge.js';
import { authRouter, ensureEmailLoginCodeSchema, ensureEmailVerificationSchema, normalizeLoginEmailInput } from './validate-signup-payload.js';
import { getMembership, issueEmailLoginCode, resolveTenantIdFromRequest } from './issue-email-login-code.js';
import { handleSignup } from './handle-signup.js';

authRouter.post('/bootstrap', async (req, res, next) => {
  try {
    await ensureEmailVerificationSchema();
    const bootstrapToken = process.env.BOOTSTRAP_TOKEN || '';
    const provided = req.get('x-bootstrap-token') || req.body.token || '';
    if (!bootstrapToken || provided !== bootstrapToken) {
      return res.status(403).json({ error: 'bootstrap_forbidden' });
    }

    const usersRes = await pool.query('select count(*) as total from users');
    if (Number(usersRes.rows[0].total) > 0) {
      return res.status(409).json({ error: 'bootstrap_already_done' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email_password_required' });
    }

    const normalizedEmail = normalizeEmailInput(email);
    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = await pool.query(
      'insert into users (email, password_hash, role, status) values ($1, $2, $3, $4) returning id, email, role, status',
      [normalizedEmail, passwordHash, 'master_admin', 'active']
    );

    const user = insertRes.rows[0];
    const token = signToken({
      sub: user.id,
      email: user.email,
      username: user.email.split('@')[0],
      role: user.role,
      status: user.status,
      tenant_id: null,
    });
    return res.status(201).json({ token, user });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    await ensureEmailVerificationSchema();
    const { email, password, tenant_id } = req.body;
    const requestedTenantId = tenant_id || await resolveTenantIdFromRequest(req);
    if (!email || !password) {
      return res.status(400).json({ error: 'email_password_required' });
    }

    const normalizedEmail = normalizeLoginEmailInput(email, requestedTenantId);

    const userRes = await pool.query(
      [
        'select id, email, password_hash, role, status, email_verified_at, requires_email_verification',
        'from users where lower(email) = lower($1)',
      ].join(' '),
      [normalizedEmail]
    );
    if (!userRes.rowCount) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const user = userRes.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'user_inactive' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    if (user.requires_email_verification && !user.email_verified_at) {
      return res.status(403).json({
        error: 'email_not_verified',
        requires_email_verification: true,
      });
    }

    let tenantId = null;
    let role = user.role;
    let status = user.status || 'active';
    if (user.role !== 'master_admin') {
      const membership = await getMembership(user.id, requestedTenantId || null);
      if (!membership) {
        return res.status(403).json({ error: 'no_tenant_access' });
      }
      tenantId = membership.tenant_id;
      role = membership.role;
      status = membership.status || 'active';
      if (status !== 'active') {
        return res.status(403).json({ error: 'pending_approval' });
      }
    }
    const token = signToken({
      sub: user.id,
      email: user.email,
      username: user.email.split('@')[0],
      role,
      status,
      tenant_id: tenantId,
    });
    return res.json({
      token,
      user: { id: user.id, email: user.email, role, status, tenant_id: tenantId },
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/exchange-vase', async (req, res, next) => {
  try {
    const result = await exchangeVaseLaunchToken(req.body?.token);
    return res.json(result);
  } catch (err) {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'launch_token_expired' });
    }
    if (err?.name === 'JsonWebTokenError' || err?.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'invalid_launch_token' });
    }
    if (err?.status) {
      return res.status(err.status).json({ error: err.code || err.message || 'launch_exchange_failed' });
    }
    return next(err);
  }
});


authRouter.post('/signup', handleSignup);
authRouter.post('/register', handleSignup);

authRouter.post('/request-login-code', async (req, res, next) => {
  try {
    await ensureEmailLoginCodeSchema();
    const { email, tenant_id } = req.body || {};
    const requestedTenantId = tenant_id || await resolveTenantIdFromRequest(req);
    if (!email) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const normalizedEmail = normalizeLoginEmailInput(email, requestedTenantId);
    const userRes = await pool.query(
      [
        'select id, email, role, status, display_name, requires_email_verification, email_verified_at',
        'from users where lower(email) = lower($1) limit 1',
      ].join(' '),
      [normalizedEmail]
    );
    if (!userRes.rowCount) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    const user = userRes.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'user_inactive' });
    }
    if (user.requires_email_verification && !user.email_verified_at) {
      return res.status(403).json({ error: 'email_not_verified' });
    }
    if (user.role !== 'master_admin') {
      const membership = await getMembership(user.id, requestedTenantId || null);
      if (!membership) {
        return res.status(403).json({ error: 'no_tenant_access' });
      }
      if ((membership.status || 'active') !== 'active') {
        return res.status(403).json({ error: 'pending_approval' });
      }
    }

    const delivery = await issueEmailLoginCode({
      userId: user.id,
      email: user.email,
      recipientName: user.display_name || '',
      tenantId: requestedTenantId || '',
    });
    return res.json({ ok: true, delivery });
  } catch (err) {
    return next(err);
  }
});
