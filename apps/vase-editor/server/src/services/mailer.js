import { pool } from '../db.js';
import { resolveMailConfig } from './mailConfig.js';

export function normalizeEmailInput(email) {
  return String(email || '').trim().toLowerCase();
}

export function normalizeDisplayName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '';
  return trimmed.slice(0, 80);
}

export function getEmailCompanyName(fallback = '') {
  const value = String(
    process.env.EMAIL_COMPANY_NAME ||
      process.env.APP_NAME ||
      fallback ||
      'Tu empresa'
  ).trim();
  return value || fallback || 'Tu empresa';
}

export function classifySmtpError(error = {}) {
  const code = String(error?.code || '').toUpperCase();
  if (code === 'EAUTH') return { errorType: 'authentication', code, message: 'El servidor rechazó el usuario o la contraseña.' };
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return { errorType: 'timeout', code, message: 'El servidor SMTP tardó demasiado en responder.' };
  if (code.includes('TLS') || code === 'ESOCKET') return { errorType: 'tls', code, message: 'No fue posible establecer una conexión segura con el servidor.' };
  return { errorType: 'connection', code: code || 'SMTP_ERROR', message: 'No se pudo conectar con el servidor SMTP.' };
}

export function validateSmtpConfig(config = {}) {
  if (!config?.host || !config?.user || !config?.pass || !Number.isInteger(Number(config?.port)) || Number(config.port) < 1 || Number(config.port) > 65535) {
    return { errorType: 'configuration', code: 'SMTP_CONFIGURATION_INCOMPLETE', message: 'Completá los datos SMTP requeridos antes de probar la conexión.' };
  }
  return null;
}

async function createSmtpTransport(config) {
  const nodemailerModule = await import('nodemailer').catch(() => null);
  const nodemailer = nodemailerModule?.default || nodemailerModule;
  if (!nodemailer?.createTransport) return null;
  return nodemailer.createTransport({ host: config.host, port: Number(config.port), secure: Boolean(config.secure), auth: { user: config.user, pass: config.pass } });
}

export async function verifySmtpConnection({ tenantId = '', smtp = null } = {}) {
  const config = smtp || await resolveTenantMailConfig(tenantId) || resolveMailConfig({}, process.env);
  const invalid = validateSmtpConfig(config);
  if (invalid) return { verified: false, provider: 'smtp', ...invalid };
  try {
    const transporter = await createSmtpTransport(config);
    if (!transporter) return { verified: false, provider: 'smtp', errorType: 'configuration', code: 'NODEMAILER_UNAVAILABLE', message: 'El servicio SMTP no está disponible.' };
    await transporter.verify();
    return { verified: true, provider: 'smtp', server: `${config.host}:${config.port}`, secure: Boolean(config.secure), user: config.user };
  } catch (error) { return { verified: false, provider: 'smtp', ...classifySmtpError(error) }; }
}

async function resolveTenantMailConfig(tenantId = '') {
  const id = String(tenantId || '').trim();
  if (!id) return null;
  try {
    const result = await pool.query(
      'select commerce from tenant_settings where tenant_id = $1 limit 1',
      [id]
    );
    const commerce = result.rows[0]?.commerce || {};
    return resolveMailConfig(commerce);
  } catch (err) {
    console.warn('[mailer] No se pudo resolver SMTP por tenant:', err?.message || err);
    return null;
  }
}

export async function sendSmtpEmail({
  to,
  subject,
  text,
  html,
  from,
  logPrefix = 'email',
  tenantId = '',
  smtp = null,
}) {
  const recipient = normalizeEmailInput(to);
  if (!recipient || !subject) {
    return { sent: false, provider: 'invalid' };
  }

  const tenantConfig = smtp || (await resolveTenantMailConfig(tenantId));
  const config = tenantConfig || resolveMailConfig({}, process.env);
  const smtpHost = config?.host;
  const smtpUser = config?.user;
  const smtpPass = config?.pass;
  const smtpPort = config?.port;
  const smtpSecure = config?.secure;
  const fromAddress = from || config?.from || smtpUser || 'no-reply@vase.local';

  const invalid = validateSmtpConfig(config);
  if (invalid) {
    console.log(`[${logPrefix}] SMTP no configurado para ${recipient}.`);
    return { sent: false, provider: 'smtp', ...invalid };
  }

  try {
    const transporter = await createSmtpTransport({ host: smtpHost, port: smtpPort, secure: smtpSecure, user: smtpUser, pass: smtpPass });
    if (!transporter) {
      console.warn(`[${logPrefix}] nodemailer no disponible.`);
      return { sent: false, provider: 'log' };
    }

    await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      text,
      html,
    });

    return { sent: true, provider: 'smtp' };
  } catch (err) {
    console.error(`[${logPrefix}] Error enviando email`, err?.code || err?.name || 'SMTP_ERROR');
    return { sent: false, provider: 'smtp', ...classifySmtpError(err) };
  }
}
