import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { pool } from '../db.js';
import { signToken } from '../middleware/auth.js';
import { normalizeDisplayName, normalizeEmailInput } from './mailer.js';
import { ensureTenantPlatformDomain } from './tenantDomains.js';

const EXTERNAL_SOURCE = 'vase';
const BRIDGE_ISSUER = process.env.VASE_BUSINESS_SSO_ISSUER || 'vase-app';
const BRIDGE_AUDIENCE = process.env.VASE_BUSINESS_SSO_AUDIENCE || 'vase-business';
const ALLOWED_TENANT_ROLES = new Set(['OWNER', 'MANAGER']);
const DEFAULT_EXTERNAL_DESIGN_PRESET = 'generic';

function createBridgeError(code, status = 400) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function getBridgeSecret() {
  const secret = String(process.env.VASE_BUSINESS_SSO_SECRET || '').trim();
  if (!secret) {
    throw createBridgeError('sso_secret_not_configured', 503);
  }
  return secret;
}

function normalizeInternalRole(value) {
  return value === 'master_admin' ? 'master_admin' : 'tenant_admin';
}

function normalizeTenantPresetText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeDesignPreset(value) {
  return normalizeTenantPresetText(value).replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

function getConfiguredTenantPreset(payload) {
  const entries = String(process.env.VASE_BUSINESS_TENANT_PRESETS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const lookup = new Map();
  for (const entry of entries) {
    const [rawKey, rawPreset] = entry.split(':');
    const key = normalizeTenantPresetText(rawKey);
    const preset = normalizeDesignPreset(rawPreset);
    if (key && preset) {
      lookup.set(key, preset);
    }
  }

  const candidates = [
    payload.externalTenantId,
    payload.externalTenantSlug,
    payload.tenantName,
  ].map(normalizeTenantPresetText).filter(Boolean);

  for (const candidate of candidates) {
    if (lookup.has(candidate)) return lookup.get(candidate);
  }

  return '';
}

function getConfiguredTenantStaticSiteUrl(payload) {
  const entries = String(process.env.VASE_BUSINESS_TENANT_STATIC_SITES || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const lookup = new Map();
  for (const entry of entries) {
    const separatorIndex = entry.indexOf(':');
    if (separatorIndex <= 0) continue;
    const rawKey = entry.slice(0, separatorIndex);
    const rawUrl = entry.slice(separatorIndex + 1);
    const key = normalizeTenantPresetText(rawKey);
    const url = String(rawUrl || '').trim();
    if (key && url) {
      lookup.set(key, url);
    }
  }

  const candidates = [
    payload.externalTenantId,
    payload.externalTenantSlug,
    payload.tenantName,
  ].map(normalizeTenantPresetText).filter(Boolean);

  for (const candidate of candidates) {
    if (lookup.has(candidate)) return lookup.get(candidate);
  }

  return '';
}

function resolvePayloadDesignPreset(rawPayload, normalizedPayload) {
  const explicitPreset = normalizeDesignPreset(
    rawPayload.design_preset ||
    rawPayload.tenant_design_preset ||
    rawPayload.editor_design_preset ||
    rawPayload.branding?.design_preset
  );
  if (explicitPreset) return explicitPreset;

  return getConfiguredTenantPreset(normalizedPayload) || null;
}

function resolvePayloadStaticSiteUrl(rawPayload, normalizedPayload) {
  return String(
    rawPayload.custom_static_site_url ||
    rawPayload.custom_site_url ||
    rawPayload.static_site_url ||
    rawPayload.public_url ||
    rawPayload.storefront_public_url ||
    rawPayload.branding?.custom_static_site_url ||
    getConfiguredTenantStaticSiteUrl(normalizedPayload) ||
    ''
  ).trim();
}

function buildDefaultTenantSettings(tenantName, designPreset = null, staticSiteUrl = '') {
  const safeName = normalizeDisplayName(tenantName) || 'Vase Business';

  const branding = {
    name: safeName,
  };
  if (designPreset) {
    branding.design_preset = normalizeDesignPreset(designPreset);
  } else {
    branding.design_preset = DEFAULT_EXTERNAL_DESIGN_PRESET;
  }
  if (staticSiteUrl) {
    branding.custom_static_site_url = staticSiteUrl;
  }

  return {
    branding,
    theme: {},
    commerce: {
      mode: 'hybrid',
      currency: 'ARS',
      whatsapp_number: '',
      email: '',
    },
  };
}

function normalizeLaunchPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const userId = String(payload.sub || '').trim();
  const email = normalizeEmailInput(payload.email);
  const tenantId = String(payload.tenant_id || '').trim();
  const tenantSlug = String(payload.tenant_slug || '').trim();
  const tenantName = normalizeDisplayName(payload.tenant_name || '') || 'Vase Business';
  const tenantRole = String(payload.tenant_role || '').trim().toUpperCase();
  const displayName = normalizeDisplayName(payload.name || payload.user_name || '');
  const platformRole = String(payload.platform_role || '').trim().toUpperCase();

  if (!userId || !email || !tenantId) {
    throw createBridgeError('invalid_launch_payload', 401);
  }

  if (!ALLOWED_TENANT_ROLES.has(tenantRole)) {
    throw createBridgeError('membership_forbidden', 403);
  }

  const normalizedPayload = {
    externalUserId: userId,
    email,
    displayName,
    platformRole,
    externalTenantId: tenantId,
    externalTenantSlug: tenantSlug,
    tenantName,
    externalTenantRole: tenantRole,
  };
  return {
    ...normalizedPayload,
    designPreset: resolvePayloadDesignPreset(payload, normalizedPayload),
    staticSiteUrl: resolvePayloadStaticSiteUrl(payload, normalizedPayload),
  };
}

export async function ensureVaseBridgeSchema() {
  await pool.query('alter table users add column if not exists external_source text');
  await pool.query('alter table users add column if not exists external_user_id text');
  await pool.query('alter table users add column if not exists display_name text');
  await pool.query(
    'create unique index if not exists users_external_identity_idx on users(external_source, external_user_id) where external_user_id is not null'
  );

  await pool.query('alter table tenants add column if not exists external_source text');
  await pool.query('alter table tenants add column if not exists external_tenant_id text');
  await pool.query('alter table tenants add column if not exists external_tenant_slug text');
  await pool.query(
    'create unique index if not exists tenants_external_identity_idx on tenants(external_source, external_tenant_id) where external_tenant_id is not null'
  );
  await pool.query(
    'create unique index if not exists tenants_external_slug_idx on tenants(external_source, external_tenant_slug) where external_tenant_slug is not null'
  );
}

export function verifyVaseLaunchToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) {
    throw createBridgeError('launch_token_required', 400);
  }

  const payload = jwt.verify(token, getBridgeSecret(), {
    issuer: BRIDGE_ISSUER,
    audience: BRIDGE_AUDIENCE,
  });

  return normalizeLaunchPayload(payload);
}

async function upsertTenant(client, payload) {
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

async function ensureTenantSettings(client, tenantId, tenantName, designPreset = null, staticSiteUrl = '') {
  const existingSettingsRes = await client.query(
    'select branding, theme, seo, commerce from tenant_settings where tenant_id = $1',
    [tenantId]
  );

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
  await client.query(
    [
      'insert into tenant_settings (tenant_id, branding, theme, seo, commerce)',
      'values ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb)',
    ].join(' '),
    [tenantId, defaults.branding, defaults.theme, {}, defaults.commerce]
  );
}

async function upsertUser(client, payload) {
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

async function ensureMembership(client, userId, tenantId) {
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

export async function exchangeVaseLaunchToken(rawToken) {
  await ensureVaseBridgeSchema();
  const payload = verifyVaseLaunchToken(rawToken);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tenant = await upsertTenant(client, payload);
    await ensureTenantSettings(client, tenant.id, tenant.name, payload.designPreset, payload.staticSiteUrl);
    await ensureTenantPlatformDomain(client, tenant.id, {
      preferredSubdomain: payload.externalTenantSlug || '',
      preferredLabels: [payload.displayName || '', payload.tenantName || ''],
      email: payload.email || '',
      onlyWhenMissing: false,
    });

    const user = await upsertUser(client, payload);
    await ensureMembership(client, user.id, tenant.id);

    await client.query('COMMIT');

    const token = signToken({
      sub: user.id,
      role: user.role,
      status: user.status,
      tenant_id: tenant.id,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        tenant_id: tenant.id,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        external_tenant_id: payload.externalTenantId,
        external_tenant_slug: payload.externalTenantSlug || null,
      },
      external: {
        source: EXTERNAL_SOURCE,
        user_id: payload.externalUserId,
        tenant_id: payload.externalTenantId,
        tenant_role: payload.externalTenantRole,
        platform_role: payload.platformRole || null,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
