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
import { exchangeVaseLaunchToken } from '../services/vaseBridge.js';
import { ensureUserProfileSchema, normalizeProfileFields, profileColumnsToSelect } from '../services/userProfile.js';

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

async function ensureEmailLoginCodeSchema() {
  await pool.query(
    [
      'create table if not exists email_login_codes (',
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
    'create index if not exists email_login_codes_user_idx on email_login_codes(user_id, created_at desc)'
  );
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_PATTERN = /^\+?[0-9()\-\s]{7,25}$/;
const CUIL_PATTERN = /^\d{2}-?\d{8}-?\d{1}$/;
const ENABLE_PIQUIM_ADMIN_ALIAS =
  String(process.env.ENABLE_PIQUIM_BOOTSTRAP || process.env.ENABLE_PIQUIM_AUTH_ALIAS || '')
    .trim()
    .toLowerCase() === 'true';
const PIQUIM_TENANT_IDS = new Set(
  String(ENABLE_PIQUIM_ADMIN_ALIAS ? (process.env.PIQUIM_TENANT_IDS || process.env.PIQUIM_TENANT_ID || '') : '')
    .split(',')
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
);

function normalizeLoginEmailInput(rawEmail, tenantId = '') {
  const value = String(rawEmail || '').trim();
  if (value.toLowerCase() !== 'admin') {
    return normalizeEmailInput(value);
  }
  return PIQUIM_TENANT_IDS.has(String(tenantId || '').trim().toLowerCase())
    ? 'admin@piquim.local'
    : 'admin@teflon.local';
}

function validateSignupPayload({ email = '', password = '', name = '', profile = {} }) {
  const errors = [];
  const normalizedEmail = normalizeEmailInput(email);
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    errors.push('email_invalid');
  }

  const passwordValue = String(password || '');
  if (passwordValue.length < 8 || passwordValue.length > 72) {
    errors.push('password_invalid_length');
  }
  if (!/[A-Za-z]/.test(passwordValue) || !/\d/.test(passwordValue)) {
    errors.push('password_invalid_format');
  }

  const fullName = String(name || '').trim();
  if (fullName.length < 2 || fullName.length > 120) {
    errors.push('name_invalid');
  }

  const phone = String(profile.phone || '').trim();
  if (!PHONE_PATTERN.test(phone)) {
    errors.push('phone_invalid');
  }

  const businessName = String(profile.business_name || '').trim();
  if (businessName.length < 2 || businessName.length > 180) {
    errors.push('business_name_invalid');
  }

  const businessActivity = String(profile.business_activity || '').trim();
  if (businessActivity.length < 2 || businessActivity.length > 180) {
    errors.push('business_activity_invalid');
  }

  const cuil = String(profile.cuil || '').trim();
  if (!CUIL_PATTERN.test(cuil)) {
    errors.push('cuil_invalid');
  }

  const address = String(profile.address || '').trim();
  if (address.length < 5 || address.length > 240) {
    errors.push('address_invalid');
  }

  const city = String(profile.city || '').trim();
  if (city.length < 2 || city.length > 120) {
    errors.push('city_invalid');
  }

  const province = String(profile.province || '').trim();
  if (province.length < 2 || province.length > 120) {
    errors.push('province_invalid');
  }

  const countryCode = String(profile.country_code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    errors.push('country_invalid');
  }

  const postalCode = String(profile.postal_code || '').trim();
  if (postalCode.length < 3 || postalCode.length > 20) {
    errors.push('postal_code_invalid');
  }

  return errors;
}

async function sendVerificationEmail(email, code, recipientName = '', tenantId = '') {
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
    tenantId,
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
    `Admin: ${process.env.PUBLIC_ADMIN_URL || process.env.ADMIN_PANEL_URL || 'Panel de administracion'}`,
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
    `<p><strong>Admin:</strong> ${process.env.PUBLIC_ADMIN_URL || process.env.ADMIN_PANEL_URL || 'Panel de administracion'}</p>`,
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

async function issueEmailVerificationCode(userId, email, recipientName = '', tenantId = '') {
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

  const delivery = await sendVerificationEmail(normalizedEmail, code, recipientName, tenantId);
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

async function issueEmailLoginCode({ userId, email, recipientName = '', tenantId = '' }) {
  await ensureEmailLoginCodeSchema();
  const normalizedEmail = normalizeEmailInput(email);
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

  await pool.query(
    'delete from email_login_codes where user_id = $1 and verified_at is null',
    [userId]
  );

  await pool.query(
    [
      'insert into email_login_codes',
      '(user_id, email, code_hash, attempts, max_attempts, expires_at)',
      'values ($1, $2, $3, $4, $5, $6)',
    ].join(' '),
    [userId, normalizedEmail, codeHash, 0, VERIFICATION_MAX_ATTEMPTS, expiresAt]
  );

  const companyName = getEmailCompanyName();
  const safeName = normalizeDisplayName(recipientName);
  const greetingLine = safeName ? `Hola, ${safeName}:` : 'Hola:';
  const subject = `Codigo para iniciar sesion en ${companyName}`;
  const textBody = [
    greetingLine,
    '',
    'Recibimos un pedido para iniciar sesion con tu email.',
    '',
    'Tu codigo es:',
    String(code),
    '',
    'Ingresa este codigo en la pantalla de login para continuar.',
    '',
    `Si no solicitaste acceso a ${companyName}, puedes ignorar este correo.`,
    '',
    `Equipo ${companyName}`,
  ].join('\n');
  const htmlBody = [
    `<p>${greetingLine}</p>`,
    '<p>Recibimos un pedido para iniciar sesion con tu email.</p>',
    '<p><strong>Tu codigo es:</strong></p>',
    `<h2 style="letter-spacing:4px;">${code}</h2>`,
    '<p>Ingresa este codigo en la pantalla de login para continuar.</p>',
    `<p>Si no solicitaste acceso a ${companyName}, puedes ignorar este correo.</p>`,
    `<p>Equipo ${companyName}</p>`,
  ].join('');

  const delivery = await sendSmtpEmail({
    to: normalizedEmail,
    subject,
    text: textBody,
    html: htmlBody,
    logPrefix: 'email-login-code',
    tenantId,
  });

  if (!delivery.sent) {
    console.log(`[email-login-code] Codigo para ${normalizedEmail}: ${code}`);
  }

  const payload = {
    sent: delivery.sent,
    provider: delivery.provider,
    expires_in_minutes: VERIFICATION_CODE_TTL_MINUTES,
  };
  if (process.env.NODE_ENV !== 'production') {
    payload.debug_code = code;
  }
  return payload;
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

async function resolveTenantIdFromRequest(req) {
  const bodyId = String(req.body?.tenant_id || '').trim();
  if (bodyId) return bodyId;

  const headerId = String(req.get('x-tenant-id') || '').trim();
  if (headerId) return headerId;

  const forwardedHost = String(
    req.get('x-original-host') ||
    req.get('x-forwarded-host') ||
    req.hostname ||
    req.get('host') ||
    ''
  ).split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');

  if (!forwardedHost) return '';

  const candidates = forwardedHost.startsWith('www.')
    ? [forwardedHost, forwardedHost.slice(4)]
    : [forwardedHost];

  try {
    const result = await pool.query(
      [
        'select t.id from tenant_domains d',
        'join tenants t on t.id = d.tenant_id',
        'where d.domain = any($1::text[]) and t.status = $2',
        'order by array_position($1::text[], d.domain) asc',
        'limit 1',
      ].join(' '),
      [candidates, 'active']
    );
    return result.rows[0]?.id || '';
  } catch (err) {
    console.warn('resolveTenantIdFromRequest host lookup failed:', err.message);
    return '';
  }
}

async function handleSignup(req, res, next) {
  try {
    await ensureEmailVerificationSchema();
    const { email, password, role, name } = req.body;
    const tenant_id = await resolveTenantIdFromRequest(req);

    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields', details: 'email y password son obligatorios' });
    }
    if (!tenant_id) {
      return res.status(400).json({
        error: 'missing_fields',
        details: 'No se pudo identificar el sitio. Verifica que el dominio esta asociado a un tenant.',
      });
    }
    const normalizedEmail = normalizeLoginEmailInput(email, requestedTenantId);
    if (!normalizedEmail) {
      return res.status(400).json({ error: 'missing_fields', details: 'email invalido' });
    }

    const validRoles = ['retail', 'wholesale'];
    const assignedRole = validRoles.includes(role) ? role : 'retail';

    await ensureUserProfileSchema();
    const profile = normalizeProfileFields(req.body);
    const displayName = String(name || '').trim() || null;
    if (!profile.phone || !profile.business_name || !profile.business_activity || !profile.cuil || !profile.address || !profile.city || !profile.province || !profile.country_code) {
      return res.status(400).json({
        error: 'missing_fields',
        details:
          'Faltan datos obligatorios para compra (telefono, razon social/negocio, actividad, cuil, domicilio, localidad, provincia y pais).',
      });
    }
    const payloadErrors = validateSignupPayload({ email, password, name, profile });
    if (payloadErrors.length) {
      return res.status(400).json({
        error: 'invalid_fields',
        fields: payloadErrors,
      });
    }

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
        const verification = await issueEmailVerificationCode(existingUser.id, existingUser.email, name, tenant_id);
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
        'insert into users (',
        '  email, password_hash, role, status, email_verified_at, requires_email_verification,',
        '  display_name, phone, address, address_extra, country_code, country_label,',
        '  province, city, postal_code, business_name, business_activity, cuil',
        ') values (',
        '  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18',
        ') returning id, email, role, status, email_verified_at, requires_email_verification',
      ].join(' '),
      [
        normalizedEmail, passwordHash, assignedRole, 'active', null, true,
        displayName,
        profile.phone, profile.address, profile.address_extra,
        profile.country_code, profile.country_label,
        profile.province, profile.city, profile.postal_code,
        profile.business_name, profile.business_activity, profile.cuil,
      ]
    );

    const user = userRes.rows[0];
    // New accounts require manual approval from admin.
    const membershipStatus = 'pending';
    await pool.query(
      'insert into user_tenants (user_id, tenant_id, role, status) values ($1, $2, $3, $4)',
      [user.id, tenant_id, assignedRole, membershipStatus]
    );
    const verification = await issueEmailVerificationCode(user.id, user.email, name, tenant_id);
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

    const verification = await issueEmailVerificationCode(user.id, user.email, '', tenant_id || '');
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
    await ensureUserProfileSchema();
    const userRes = await pool.query(
      `select id, email, role, status, display_name, ${profileColumnsToSelect()} from users where id = $1`,
      [req.user.id]
    );
    if (!userRes.rowCount) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const user = userRes.rows[0];
    let tenantId = req.tenant?.id || req.user.tenantId || null;
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
        display_name: user.display_name,
        name: user.display_name,
        phone: user.phone,
        address: user.address,
        address_extra: user.address_extra,
        country_code: user.country_code,
        country_label: user.country_label,
        province: user.province,
        city: user.city,
        postal_code: user.postal_code,
        business_name: user.business_name,
        business_activity: user.business_activity,
        cuil: user.cuil,
        photo_url: user.photo_url,
        billing_info: user.billing_info || {},
      },
    });
  } catch (err) {
    return next(err);
  }
}

authRouter.get('/me', authenticate, getMeHandler);
