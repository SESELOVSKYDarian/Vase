// Parte de auth.js: authRouter, VERIFICATION_CODE_TTL_MINUTES, VERIFICATION_MAX_ATTEMPTS, ensureEmailVerificationSchema, ensureEmailLoginCodeSchema, generateVerificationCode y más.
import express from 'express';
import crypto from 'crypto';
import { pool } from '../../db.js';
import { getEmailCompanyName, normalizeDisplayName, normalizeEmailInput, sendSmtpEmail } from '../../services/mailer.js';

export const authRouter = express.Router();
export const VERIFICATION_CODE_TTL_MINUTES = Math.max(5, Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES || 15));
export const VERIFICATION_MAX_ATTEMPTS = Math.max(3, Number(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || 5));

export async function ensureEmailVerificationSchema() {
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

export async function ensureEmailLoginCodeSchema() {
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

export function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
export const PHONE_PATTERN = /^\+?[0-9()\-\s]{7,25}$/;
export const CUIL_PATTERN = /^\d{2}-?\d{8}-?\d{1}$/;
export const ENABLE_PIQUIM_ADMIN_ALIAS =
  String(process.env.ENABLE_PIQUIM_BOOTSTRAP || process.env.ENABLE_PIQUIM_AUTH_ALIAS || '')
    .trim()
    .toLowerCase() === 'true';
export const PIQUIM_TENANT_IDS = new Set(
  String(ENABLE_PIQUIM_ADMIN_ALIAS ? (process.env.PIQUIM_TENANT_IDS || process.env.PIQUIM_TENANT_ID || '') : '')
    .split(',')
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase())
);

export function normalizeLoginEmailInput(rawEmail, tenantId = '') {
  const value = String(rawEmail || '').trim();
  if (value.toLowerCase() !== 'admin') {
    return normalizeEmailInput(value);
  }
  return PIQUIM_TENANT_IDS.has(String(tenantId || '').trim().toLowerCase())
    ? 'admin@piquim.local'
    : 'admin@teflon.local';
}

export function validateSignupPayload({ email = '', password = '', name = '', profile = {} }) {
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

export async function resolveTenantCompanyName(tenantId = '') {
  if (!tenantId) return getEmailCompanyName();
  try {
    const { tenantName } = await getApprovalNotificationRecipient(tenantId);
    return tenantName || getEmailCompanyName();
  } catch {
    return getEmailCompanyName();
  }
}

export async function sendVerificationEmail(email, code, recipientName = '', tenantId = '') {
  const companyName = await resolveTenantCompanyName(tenantId);
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

export async function getApprovalNotificationRecipient(tenantId) {
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
