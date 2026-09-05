const text = (value) => String(value || '').trim();
const truthy = (value) => String(value || '').trim().toLowerCase() === 'true';

export function resolveMailConfig(commerce = {}, environment = process.env) {
  const smtpUser = text(commerce.smtp_user);
  const smtpPassword = text(commerce.smtp_password);
  const gmailUser = text(commerce.gmail_sender_email);
  const gmailPassword = text(commerce.gmail_app_password);
  const usesTenantSmtp = Boolean(smtpUser && smtpPassword);
  const usesLegacyGmail = !usesTenantSmtp && Boolean(gmailUser && gmailPassword);
  const user = smtpUser || gmailUser || text(environment.SMTP_USER);
  const pass = smtpPassword || gmailPassword || text(environment.SMTP_PASS);

  if (!user || !pass) return null;

  return {
    host: text(commerce.smtp_host) || (usesLegacyGmail ? 'smtp.gmail.com' : text(environment.SMTP_HOST)),
    port: Number(commerce.smtp_port || (usesLegacyGmail ? 465 : environment.SMTP_PORT) || 587),
    secure: commerce.smtp_secure !== undefined
      ? commerce.smtp_secure === true || truthy(commerce.smtp_secure)
      : usesLegacyGmail || truthy(environment.SMTP_SECURE),
    user,
    pass,
    from: text(commerce.smtp_from) || text(environment.SMTP_FROM) || user,
    fromName: text(commerce.smtp_from_name),
  };
}
