// Rutas de auth.js: post-login-with-code, post-verify-email, post-resend-verification, post-logout, get-me.
import { pool } from '../../db.js';
import { authenticate, signToken } from '../../middleware/auth.js';
import { normalizeEmailInput } from '../../services/mailer.js';
import { VERIFICATION_MAX_ATTEMPTS, authRouter, ensureEmailLoginCodeSchema, ensureEmailVerificationSchema, hashVerificationCode } from './validate-signup-payload.js';
import { getMembership, issueEmailVerificationCode, resolveTenantIdFromRequest, sendApprovalRequestedEmail } from './issue-email-login-code.js';
import { getMeHandler } from './handle-signup.js';

authRouter.post('/login-with-code', async (req, res, next) => {
  try {
    await ensureEmailLoginCodeSchema();
    const { email, code, tenant_id } = req.body || {};
    const requestedTenantId = tenant_id || await resolveTenantIdFromRequest(req);
    if (!email || !code) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const normalizedEmail = normalizeEmailInput(email);
    const userRes = await pool.query(
      [
        'select id, email, role, status, requires_email_verification, email_verified_at',
        'from users where lower(email) = lower($1) limit 1',
      ].join(' '),
      [normalizedEmail]
    );
    if (!userRes.rowCount) {
      return res.status(401).json({ error: 'invalid_code' });
    }
    const user = userRes.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'user_inactive' });
    }
    if (user.requires_email_verification && !user.email_verified_at) {
      return res.status(403).json({ error: 'email_not_verified' });
    }

    const codeRes = await pool.query(
      [
        'select id, code_hash, attempts, max_attempts, expires_at, verified_at',
        'from email_login_codes',
        'where user_id = $1 and verified_at is null',
        'order by created_at desc limit 1',
      ].join(' '),
      [user.id]
    );
    if (!codeRes.rowCount) {
      return res.status(400).json({ error: 'code_not_found' });
    }
    const loginCode = codeRes.rows[0];
    if (new Date(loginCode.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'code_expired' });
    }
    if (Number(loginCode.attempts || 0) >= Number(loginCode.max_attempts || VERIFICATION_MAX_ATTEMPTS)) {
      return res.status(400).json({ error: 'code_locked' });
    }
    const incomingHash = hashVerificationCode(String(code).trim());
    if (incomingHash !== loginCode.code_hash) {
      await pool.query('update email_login_codes set attempts = attempts + 1 where id = $1', [loginCode.id]);
      return res.status(401).json({ error: 'invalid_code' });
    }
    await pool.query('update email_login_codes set verified_at = now() where id = $1', [loginCode.id]);

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

authRouter.post('/verify-email', async (req, res, next) => {
  try {
    await ensureEmailVerificationSchema();
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const normalizedEmail = normalizeEmailInput(email);

    const userRes = await pool.query(
      'select id, email, requires_email_verification, email_verified_at from users where lower(email) = lower($1)',
      [normalizedEmail]
    );
    if (!userRes.rowCount) {
      return res.status(404).json({ error: 'verification_not_found' });
    }
    const user = userRes.rows[0];

    if (!user.requires_email_verification || user.email_verified_at) {
      return res.json({ ok: true, already_verified: true });
    }

    const verificationRes = await pool.query(
      [
        'select id, code_hash, attempts, max_attempts, expires_at, verified_at',
        'from email_verification_codes',
        'where user_id = $1 and verified_at is null',
        'order by created_at desc',
        'limit 1',
      ].join(' '),
      [user.id]
    );
    if (!verificationRes.rowCount) {
      return res.status(400).json({ error: 'code_not_found' });
    }

    const verification = verificationRes.rows[0];
    if (verification.verified_at) {
      return res.json({ ok: true, already_verified: true });
    }
    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'code_expired' });
    }
    if (Number(verification.attempts || 0) >= Number(verification.max_attempts || VERIFICATION_MAX_ATTEMPTS)) {
      return res.status(400).json({ error: 'code_locked' });
    }

    const incomingHash = hashVerificationCode(String(code).trim());
    if (incomingHash !== verification.code_hash) {
      await pool.query(
        'update email_verification_codes set attempts = attempts + 1 where id = $1',
        [verification.id]
      );
      return res.status(400).json({ error: 'invalid_code' });
    }

    await pool.query(
      'update email_verification_codes set verified_at = now() where id = $1',
      [verification.id]
    );
    await pool.query(
      'update users set email_verified_at = now(), requires_email_verification = false where id = $1',
      [user.id]
    );

    // Notify admin ONLY after email is verified (y solo si la cuenta espera aprobación)
    let pendingApproval = true;
    try {
      const membershipRes = await pool.query(
        'select tenant_id, role, status from user_tenants where user_id = $1 limit 1',
        [user.id]
      );
      const membership = membershipRes.rows[0];
      pendingApproval = membership ? membership.status !== 'active' : true;
      if (membership && pendingApproval) {
        await sendApprovalRequestedEmail({
          tenantId: membership.tenant_id,
          applicantEmail: user.email,
          applicantRole: membership.role,
        });
      }
    } catch (notificationError) {
      console.error('[pending-approval-notification] No se pudo notificar al admin tras verificacion', notificationError);
    }

    return res.json({ ok: true, verified: true, pending_approval: pendingApproval });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/resend-verification', async (req, res, next) => {
  try {
    await ensureEmailVerificationSchema();
    const { email, tenant_id } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const normalizedEmail = normalizeEmailInput(email);

    const userRes = await pool.query(
      'select id, email, requires_email_verification, email_verified_at from users where lower(email) = lower($1)',
      [normalizedEmail]
    );
    if (!userRes.rowCount) {
      return res.status(404).json({ error: 'verification_not_found' });
    }
    const user = userRes.rows[0];

    if (!user.requires_email_verification || user.email_verified_at) {
      return res.json({ ok: true, already_verified: true });
    }

    let resendTenantId = tenant_id || await resolveTenantIdFromRequest(req);
    if (!resendTenantId) {
      const membershipRes = await pool.query(
        'select tenant_id from user_tenants where user_id = $1 order by created_at asc limit 1',
        [user.id]
      );
      resendTenantId = membershipRes.rows[0]?.tenant_id || '';
    }
    const verification = await issueEmailVerificationCode(user.id, user.email, '', resendTenantId);
    return res.json({ ok: true, verification });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/logout', (req, res) => {
  return res.json({ ok: true });
});


authRouter.get('/me', authenticate, getMeHandler);
