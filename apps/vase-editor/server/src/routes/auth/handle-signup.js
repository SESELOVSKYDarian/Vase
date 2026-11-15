// Parte de auth.js: handleSignup, getMeHandler.
import bcrypt from 'bcryptjs';
import { pool } from '../../db.js';
import { resolveInitialMembershipStatus } from '../../services/customerApproval.js';
import { ensureUserProfileSchema, normalizeProfileFields, profileColumnsToSelect } from '../../services/userProfile.js';
import { ensureEmailVerificationSchema, normalizeLoginEmailInput, validateSignupPayload } from './validate-signup-payload.js';
import { getMembership, issueEmailVerificationCode, resolveTenantIdFromRequest } from './issue-email-login-code.js';

export async function handleSignup(req, res, next) {
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
    const normalizedEmail = normalizeLoginEmailInput(email, tenant_id);
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
    // Las cuentas nuevas esperan aprobación, salvo minoristas si la tienda lo apagó (Ajustes › Precios y listas).
    const membershipStatus = await resolveInitialMembershipStatus(tenant_id, assignedRole);
    await pool.query(
      'insert into user_tenants (user_id, tenant_id, role, status) values ($1, $2, $3, $4)',
      [user.id, tenant_id, assignedRole, membershipStatus]
    );
    const verification = await issueEmailVerificationCode(user.id, user.email, name, tenant_id);
    return res.status(201).json({
      requires_approval: membershipStatus !== 'active',
      requires_email_verification: true,
      verification,
      user: { id: user.id, email: user.email, role: assignedRole, status: membershipStatus, tenant_id },
    });
  } catch (err) {
    return next(err);
  }
}


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
