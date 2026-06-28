import { pool } from '../db.js';

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

async function resolveTenantMailConfig(tenantId = '') {
  const id = String(tenantId || '').trim();
  if (!id) return null;
  try {
    const result = await pool.query(
      'select commerce from tenant_settings where tenant_id = $1 limit 1',
      [id]
    );
    const commerce = result.rows[0]?.commerce || {};
    const gmailUser = String(commerce.gmail_sender_email || '').trim();
    const gmailAppPassword = String(commerce.gmail_app_password || '').trim();
    if (!gmailUser || !gmailAppPassword) return null;
    return {
      host: String(commerce.smtp_host || '').trim() || 'smtp.gmail.com',
      port: Number(commerce.smtp_port || 465),
      secure: String(commerce.smtp_secure || 'true').toLowerCase() !== 'false',
      user: gmailUser,
      pass: gmailAppPassword,
      from: String(commerce.smtp_from || gmailUser).trim(),
    };
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
  const smtpHost = tenantConfig?.host || process.env.SMTP_HOST;
  const smtpUser = tenantConfig?.user || process.env.SMTP_USER;
  const smtpPass = tenantConfig?.pass || process.env.SMTP_PASS;
  const smtpPort = Number(tenantConfig?.port || process.env.SMTP_PORT || 587);
  const smtpSecure = tenantConfig?.secure != null
    ? Boolean(tenantConfig.secure)
    : String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const fromAddress = from || tenantConfig?.from || process.env.SMTP_FROM || smtpUser || 'no-reply@vase.local';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[${logPrefix}] SMTP no configurado para ${recipient}.`);
    return { sent: false, provider: 'log' };
  }

  try {
    const nodemailerModule = await import('nodemailer').catch(() => null);
    const nodemailer = nodemailerModule?.default || nodemailerModule;
    if (!nodemailer?.createTransport) {
      console.warn(`[${logPrefix}] nodemailer no disponible.`);
      return { sent: false, provider: 'log' };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      text,
      html,
    });

    return { sent: true, provider: 'smtp' };
  } catch (err) {
    console.error(`[${logPrefix}] Error enviando email`, err);
    return { sent: false, provider: 'smtp_error' };
  }
}
