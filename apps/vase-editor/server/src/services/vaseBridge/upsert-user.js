// Parte de vaseBridge.js: upsertTenant, ensureTenantSettings, upsertUser, ensureMembership.
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ensureTenantSettingsSeoColumn, queryTenantSettingsWithSeo } from '../tenantSettings.js';
import { normalizeDisplayName } from '../mailer.js';
import { EXTERNAL_SOURCE, buildDefaultTenantSettings, createBridgeError, normalizeDesignPreset, normalizeInternalRole } from './normalize-launch-payload.js';

export async function upsertTenant(client, payload) {
  const existingRes = await client.query(
    [
      'select id, name, status',
      'from tenants',
      'where external_source = $1 and external_tenant_id = $2',
      'limit 1',
    ].join(' '),
    [EXTERNAL_SOURCE, payload.externalTenantId]
  );

  if (existingRes.rowCount) {
    const tenant = existingRes.rows[0];
    await client.query(
      [
        'update tenants',
        'set name = $2, status = $3, external_tenant_slug = $4',
        'where id = $1',
      ].join(' '),
      [tenant.id, payload.tenantName, 'active', payload.externalTenantSlug || null]
    );
    return { id: tenant.id, name: payload.tenantName, status: 'active' };
  }

  const insertRes = await client.query(
    [
      'insert into tenants (name, status, external_source, external_tenant_id, external_tenant_slug)',
      'values ($1, $2, $3, $4, $5)',
      'returning id, name, status',
    ].join(' '),
    [
      payload.tenantName,
      'active',
      EXTERNAL_SOURCE,
      payload.externalTenantId,
      payload.externalTenantSlug || null,
    ]
  );

  return insertRes.rows[0];
}

export async function ensureTenantSettings(client, tenantId, tenantName, designPreset = null, staticSiteUrl = '') {
  await ensureTenantSettingsSeoColumn();
  const existingSettingsRes = await queryTenantSettingsWithSeo(tenantId);

  const safeName = normalizeDisplayName(tenantName) || 'Vase Business';

  if (existingSettingsRes.rowCount) {
    const existing = existingSettingsRes.rows[0];
    const branding = existing.branding || {};

    const brandingUpdate = {
      name: safeName,
    };
    if (designPreset) brandingUpdate.design_preset = normalizeDesignPreset(designPreset);
    if (staticSiteUrl) brandingUpdate.custom_static_site_url = staticSiteUrl;

    await client.query(
      [
        'update tenant_settings',
        "set branding = coalesce(branding, '{}'::jsonb) || $2::jsonb,",
        'updated_at = now()',
        'where tenant_id = $1',
      ].join(' '),
      [tenantId, brandingUpdate]
    );
    return;
  }

  const defaults = buildDefaultTenantSettings(tenantName, designPreset, staticSiteUrl);
  await ensureTenantSettingsSeoColumn();
  await client.query(
    [
      'insert into tenant_settings (tenant_id, branding, theme, seo, commerce)',
      'values ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb)',
    ].join(' '),
    [tenantId, defaults.branding, defaults.theme, {}, defaults.commerce]
  );
}

export async function upsertUser(client, payload) {
  const existingExternalRes = await client.query(
    [
      'select id, email, role, status',
      'from users',
      'where external_source = $1 and external_user_id = $2',
      'limit 1',
    ].join(' '),
    [EXTERNAL_SOURCE, payload.externalUserId]
  );

  if (existingExternalRes.rowCount) {
    const user = existingExternalRes.rows[0];
    const nextRole = normalizeInternalRole(user.role);
    await client.query(
      [
        'update users',
        'set email = $2, role = $3, status = $4, display_name = $5',
        'where id = $1',
      ].join(' '),
      [user.id, payload.email, nextRole, 'active', payload.displayName || null]
    );
    return {
      id: user.id,
      email: payload.email,
      role: nextRole,
      status: 'active',
    };
  }

  const existingEmailRes = await client.query(
    [
      'select id, email, role, status, external_source, external_user_id',
      'from users',
      'where lower(email) = lower($1)',
      'limit 1',
    ].join(' '),
    [payload.email]
  );

  if (existingEmailRes.rowCount) {
    const user = existingEmailRes.rows[0];
    if (
      user.external_user_id &&
      (user.external_source !== EXTERNAL_SOURCE || user.external_user_id !== payload.externalUserId)
    ) {
      throw createBridgeError('email_already_linked', 409);
    }

    const nextRole = normalizeInternalRole(user.role);
    await client.query(
      [
        'update users',
        'set role = $2, status = $3, external_source = $4, external_user_id = $5, display_name = $6',
        'where id = $1',
      ].join(' '),
      [user.id, nextRole, 'active', EXTERNAL_SOURCE, payload.externalUserId, payload.displayName || null]
    );
    return {
      id: user.id,
      email: user.email,
      role: nextRole,
      status: 'active',
    };
  }

  const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const insertRes = await client.query(
    [
      'insert into users (email, password_hash, role, status, external_source, external_user_id, display_name)',
      'values ($1, $2, $3, $4, $5, $6, $7)',
      'returning id, email, role, status',
    ].join(' '),
    [
      payload.email,
      placeholderHash,
      'tenant_admin',
      'active',
      EXTERNAL_SOURCE,
      payload.externalUserId,
      payload.displayName || null,
    ]
  );

  return insertRes.rows[0];
}

export async function ensureMembership(client, userId, tenantId) {
  const existingRes = await client.query(
    'select user_id from user_tenants where user_id = $1 and tenant_id = $2 limit 1',
    [userId, tenantId]
  );

  if (existingRes.rowCount) {
    await client.query(
      [
        'update user_tenants',
        'set role = $3, status = $4',
        'where user_id = $1 and tenant_id = $2',
      ].join(' '),
      [userId, tenantId, 'tenant_admin', 'active']
    );
    return;
  }

  await client.query(
    [
      'insert into user_tenants (user_id, tenant_id, role, status)',
      'values ($1, $2, $3, $4)',
    ].join(' '),
    [userId, tenantId, 'tenant_admin', 'active']
  );
}
