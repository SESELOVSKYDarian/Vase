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

export async function sendSmtpEmail({
  to,
  subject,
  text,
  html,
  from,
  logPrefix = 'email',
}) {
  const recipient = normalizeEmailInput(to);
  if (!recipient || !subject) {
    return { sent: false, provider: 'invalid' };
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const fromAddress = from || process.env.SMTP_FROM || smtpUser || 'no-reply@teflon.local';

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
