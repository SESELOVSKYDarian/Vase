import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authenticate, signToken } from '../middleware/auth.js';
import {
  getEmailCompanyName,
  normalizeDisplayName,
  normalizeEmailInput,
  sendSmtpEmail,
} from '../services/mailer.js';

export const authRouter = express.Router();
const VERIFICATION_CODE_TTL_MINUTES = Math.max(5, Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 15));
const VERIFICATION_MAX_ATTEMPTS = Math.max(3, Number(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || 5));

async function ensureEmailVerificationSchema() {
  await pool.query('alter table users add column if not exists email_verified_at timestamptz');
  await pool.query('alter table users add column if not exists requires_email_verification boolean not null default false');
  await pool.query(
    [
      'create table if not exists email_verification_codes (',
      'id uuid primary key default gen_random_uuid(),',
      'user_id uuid not null references users(id) on delete cascade,',
      'email text not null,',
      'code_hash text not null,',
      'attempts int not null default 0,',
      'max_attempts int not null default 5,',
      'expires_at timestamptz not null,',
      'verified_at timestamptz,',
      'created_at timestamptz not null default now()',
      ')',
    ].join(' ')
  );
  await pool.query(
    'create index if not exists email_verification_codes_user_idx on email_verification_codes(user_id, created_at desc)'
  );
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

async function sendVerificationEmail(email, code, recipientName = '') {
  const companyName = getEmailCompanyName();
  const safeName = normalizeDisplayName(recipientName);
  const greetingLine = safeName ? `Hola, ${safeName}:` : 'Hola:';
  const subject = `Tu codigo de verificacion de ${companyName}`;
  const textBody = [
    greetingLine,
    '',
    'Aqui tienes el codigo de seguridad para verificar tu cuenta de Gmail y finalizar tu registro con nosotros.',
    '',
    'Tu codigo de verificacion es:',
    String(code),
    '',
    'Solo tienes que copiar y pegar este numero en la pantalla de verificacion para continuar.',
    '',
    `Si no intentaste registrarte o iniciar sesion en ${companyName}, puedes ignorar y eliminar este correo de forma segura.`,
    '',
    'Saludos,',
    '',
    `El equipo de ${companyName}`,
  ].join('\n');
  const htmlBody = [
    `<p>${greetingLine}</p>`,
    '<p>Aqui tienes el codigo de seguridad para verificar tu cuenta de Gmail y finalizar tu registro con nosotros.</p>',
    '<p><strong>Tu codigo de verificacion es:</strong></p>',
    `<h2 style="letter-spacing:4px;">${code}</h2>`,
    '<p>Solo tienes que copiar y pegar este numero en la pantalla de verificacion para continuar.</p>',
    `<p>Si no intentaste registrarte o iniciar sesion en ${companyName}, puedes ignorar y eliminar este correo de forma segura.</p>`,
    '<p>Saludos,</p>',
    `<p>El equipo de ${companyName}</p>`,
  ].join('');

  const delivery = await sendSmtpEmail({
    to: email,
    subject,
    text: textBody,
    html: htmlBody,
    logPrefix: 'email-verification',
  });

  if (!delivery.sent) {
    console.log(`[email-verification] Codigo para ${email}: ${code}`);
  }
  return delivery;
}

async function getApprovalNotificationRecipient(tenantId) {
  const fallbackEmail = normalizeEmailInput(process.env.ADMIN_EMAIL || process.env.SMTP_USER || '');

  if (!tenantId) return { email: fallbackEmail, tenantName: getEmailCompanyName() };

  const tenantRes = await pool.query(
    [
      'select t.name, ts.branding, ts.commerce',
      'from tenants t',
      'left join tenant_settings ts on ts.tenant_id = t.id',
      'where t.id = $1',
      'limit 1',
    ].join(' '),
    [tenantId]
  );

  if (!tenantRes.rowCount) return { email: fallbackEmail, tenantName: getEmailCompanyName() };

  const row = tenantRes.rows[0] || {};
  const branding = row.branding || {};
  const commerce = row.commerce || {};
  const email = normalizeEmailInput(commerce.order_notification_email || commerce.email || fallbackEmail);

  return {
    email: email || fallbackEmail,
    tenantName: normalizeDisplayName(branding.name || row.name || getEmailCompanyName()),
  };
}

async function sendApprovalRequestedEmail({
  tenantId,
  applicantEmail,
  applicantName = '',
  applicantRole = 'retail',
}) {
  const recipient = await getApprovalNotificationRecipient(tenantId);
  if (!recipient?.email) {
    return { sent: false, provider: 'missing_notification_email' };
  }

  const companyName = recipient.tenantName || getEmailCompanyName();
  const normalizedApplicantEmail = normalizeEmailInput(applicantEmail);
  const safeApplicantName = normalizeDisplayName(applicantName);
  const applicantLabel = safeApplicantName || normalizedApplicantEmail || 'Nuevo usuario';
  const roleLabel = applicantRole === 'wholesale' ? 'Mayorista' : 'Minorista';
  const subject = `Nuevo usuario pendiente de aprobacion en ${companyName}`;
  const textBody = [
    'Hola,',
    '',
    `Hay un nuevo usuario pendiente de aprobacion en ${companyName}.`,
    '',
    `Nombre: ${applicantLabel}`,
    `Email: ${normalizedApplicantEmail}`,
    `Perfil solicitado: ${roleLabel}`,
    '',
    'Puedes revisarlo desde el panel de administracion en la seccion Usuarios o Notificaciones.',
    '',
    `Admin: ${process.env.PUBLIC_ADMIN_URL || process.env.ADMIN_PANEL_URL || 'Panel en Vercel'}`,
    '',
    'Saludos,',
    `Sistema ${companyName}`,
  ].join('\n');

  const htmlBody = [
    '<p>Hola,</p>',
    `<p>Hay un nuevo usuario pendiente de aprobacion en <strong>${companyName}</strong>.</p>`,
    '<ul>',
    `<li><strong>Nombre:</strong> ${applicantLabel}</li>`,
    `<li><strong>Email:</strong> ${normalizedApplicantEmail}</li>`,
    `<li><strong>Perfil solicitado:</strong> ${roleLabel}</li>`,
    '</ul>',
    '<p>Puedes revisarlo desde el panel de administracion en la seccion Usuarios o Notificaciones.</p>',
    `<p><strong>Admin:</strong> ${process.env.PUBLIC_ADMIN_URL || process.env.ADMIN_PANEL_URL || 'Panel en Vercel'}</p>`,
    `<p>Saludos,<br />Sistema ${companyName}</p>`,
  ].join('');

  return sendSmtpEmail({
    to: recipient.email,
    subject,
    text: textBody,
    html: htmlBody,
    logPrefix: 'pending-approval-notification',
  });
}

async function issueEmailVerificationCode(userId, email, recipientName = '') {
  await ensureEmailVerificationSchema();
  const normalizedEmail = normalizeEmailInput(email);
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

  await pool.query(
    'delete from email_verification_codes where user_id = $1 and verified_at is null',
    [userId]
  );

  await pool.query(
    [
      'insert into email_verification_codes',
      '(user_id, email, code_hash, attempts, max_attempts, expires_at)',
      'values ($1, $2, $3, $4, $5, $6)',
    ].join(' '),
    [userId, normalizedEmail, codeHash, 0, VERIFICATION_MAX_ATTEMPTS, expiresAt]
  );

  const delivery = await sendVerificationEmail(normalizedEmail, code, recipientName);
  const verification = {
    sent: delivery.sent,
    provider: delivery.provider,
    expires_in_minutes: VERIFICATION_CODE_TTL_MINUTES,
  };
  if (process.env.NODE_ENV !== 'production') {
    verification.debug_code = code;
  }
  return verification;
}

async function getMembership(userId, tenantId) {
  if (!userId) return null;
  if (tenantId) {
    const membershipRes = await pool.query(
      'select tenant_id, role, status from user_tenants where user_id = $1 and tenant_id = $2',
      [userId, tenantId]
    );
    return membershipRes.rows[0] || null;
  }

  const membershipRes = await pool.query(
    'select tenant_id, role, status from user_tenants where user_id = $1 order by created_at asc limit 1',
    [userId]
  );
  return membershipRes.rows[0] || null;
}

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
    const token = signToken({ sub: user.id, role: user.role, status: user.status, tenant_id: null });
    return res.status(201).json({ token, user });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    await ensureEmailVerificationSchema();
    const { email, password, tenant_id } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email_password_required' });
    }

    const rawEmail = String(email).trim();
    const normalizedEmail =
      rawEmail.toLowerCase() === 'admin' ? 'admin@teflon.local' : normalizeEmailInput(rawEmail);

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
      const membership = await getMembership(user.id, tenant_id || null);
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
    const token = signToken({ sub: user.id, role, status, tenant_id: tenantId });
    return res.json({
      token,
      user: { id: user.id, email: user.email, role, status, tenant_id: tenantId },
    });
  } catch (err) {
    return next(err);
  }
});

async function handleSignup(req, res, next) {
  try {
    await ensureEmailVerificationSchema();
    const { email, password, role, tenant_id, name } = req.body;
    if (!email || !password || !tenant_id) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const normalizedEmail = normalizeEmailInput(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const validRoles = ['retail', 'wholesale'];
    const assignedRole = validRoles.includes(role) ? role : 'retail';

    const existingUserRes = await pool.query(
      [
        'select id, email, role, status, email_verified_at, requires_email_verification',
        'from users where lower(email) = lower($1)',
        'limit 1',
      ].join(' '),
      [normalizedEmail]
    );

    if (existingUserRes.rowCount) {
      const existingUser = existingUserRes.rows[0];
      const membershipRes = await pool.query(
        'select tenant_id, role, status from user_tenants where user_id = $1 and tenant_id = $2 limit 1',
        [existingUser.id, tenant_id]
      );
      const membership = membershipRes.rows[0] || null;

      if (existingUser.requires_email_verification && !existingUser.email_verified_at) {
        const verification = await issueEmailVerificationCode(existingUser.id, existingUser.email, name);
        return res.status(409).json({
          error: 'verification_pending',
          requires_email_verification: true,
          verification,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: membership?.role || existingUser.role || assignedRole,
            status: membership?.status || 'pending',
            tenant_id,
          },
        });
      }

      if (membership?.status === 'pending') {
        return res.status(409).json({
          error: 'pending_approval',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: membership.role || existingUser.role || assignedRole,
            status: membership.status,
            tenant_id,
          },
        });
      }

      return res.status(409).json({ error: 'user_exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await pool.query(
      [
        'insert into users (email, password_hash, role, status, email_verified_at, requires_email_verification)',
        'values ($1, $2, $3, $4, $5, $6)',
        'returning id, email, role, status, email_verified_at, requires_email_verification',
      ].join(' '),
      [normalizedEmail, passwordHash, assignedRole, 'active', null, true]
    );

    const user = userRes.rows[0];
    // New accounts require manual approval from admin.
    const membershipStatus = 'pending';
    await pool.query(
      'insert into user_tenants (user_id, tenant_id, role, status) values ($1, $2, $3, $4)',
      [user.id, tenant_id, assignedRole, membershipStatus]
    );
    const verification = await issueEmailVerificationCode(user.id, user.email, name);
    return res.status(201).json({
      requires_approval: true,
      requires_email_verification: true,
      verification,
      user: { id: user.id, email: user.email, role: assignedRole, status: membershipStatus, tenant_id },
    });
  } catch (err) {
    return next(err);
  }
}

authRouter.post('/signup', handleSignup);
authRouter.post('/register', handleSignup);

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

    // Notify admin ONLY after email is verified
    try {
      const membershipRes = await pool.query(
        'select tenant_id, role from user_tenants where user_id = $1 limit 1',
        [user.id]
      );
      const membership = membershipRes.rows[0];
      if (membership) {
        await sendApprovalRequestedEmail({
          tenantId: membership.tenant_id,
          applicantEmail: user.email,
          applicantRole: membership.role,
        });
      }
    } catch (notificationError) {
      console.error('[pending-approval-notification] No se pudo notificar al admin tras verificacion', notificationError);
    }

    return res.json({ ok: true, verified: true, pending_approval: true });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/resend-verification', async (req, res, next) => {
  try {
    await ensureEmailVerificationSchema();
    const { email } = req.body || {};
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

    const verification = await issueEmailVerificationCode(user.id, user.email);
    return res.json({ ok: true, verification });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/logout', (req, res) => {
  return res.json({ ok: true });
});

export async function getMeHandler(req, res, next) {
  try {
    const userRes = await pool.query(
      'select id, email, role, status from users where id = $1',
      [req.user.id]
    );
    if (!userRes.rowCount) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const user = userRes.rows[0];
    let tenantId = req.user.tenantId || null;
    let role = user.role;
    let status = user.status || 'active';

    if (user.role !== 'master_admin') {
      const membership = await getMembership(user.id, tenantId);
      if (membership) {
        tenantId = membership.tenant_id;
        role = membership.role;
        status = membership.status || status;
      }
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role,
        status,
        tenant_id: tenantId,
      },
    });
  } catch (err) {
    return next(err);
  }
}

authRouter.get('/me', authenticate, getMeHandler);
