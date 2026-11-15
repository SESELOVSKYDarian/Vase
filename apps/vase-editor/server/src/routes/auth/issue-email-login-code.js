// Parte de auth.js: sendApprovalRequestedEmail, issueEmailVerificationCode, issueEmailLoginCode, getMembership, resolveTenantIdFromRequest.
import { pool } from '../../db.js';
import { getEmailCompanyName, normalizeDisplayName, normalizeEmailInput, sendSmtpEmail } from '../../services/mailer.js';
import { VERIFICATION_CODE_TTL_MINUTES, VERIFICATION_MAX_ATTEMPTS, ensureEmailLoginCodeSchema, ensureEmailVerificationSchema, generateVerificationCode, getApprovalNotificationRecipient, hashVerificationCode, resolveTenantCompanyName, sendVerificationEmail } from './validate-signup-payload.js';

export async function sendApprovalRequestedEmail({
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
    tenantId,
    to: recipient.email,
    subject,
    text: textBody,
    html: htmlBody,
    logPrefix: 'pending-approval-notification',
  });
}

export async function issueEmailVerificationCode(userId, email, recipientName = '', tenantId = '') {
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

export async function issueEmailLoginCode({ userId, email, recipientName = '', tenantId = '' }) {
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

  const companyName = await resolveTenantCompanyName(tenantId);
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

export async function getMembership(userId, tenantId) {
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


export async function resolveTenantIdFromRequest(req) {
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
    if (result.rows[0]?.id) {
      return result.rows[0].id;
    }

    const hostSlug = candidates[0].split('.')[0] || '';
    if (!hostSlug) {
      return '';
    }

    const slugResult = await pool.query(
      'select id from tenants where status = $2 and lower(coalesce(external_tenant_slug, \'\')) = $1 limit 1',
      [hostSlug, 'active']
    );
    return slugResult.rows[0]?.id || '';
  } catch (err) {
    console.warn('resolveTenantIdFromRequest host lookup failed:', err.message);
    return '';
  }
}
