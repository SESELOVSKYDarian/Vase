// Parte de vaseBridge.js: EXTERNAL_SOURCE, BRIDGE_ISSUER, BRIDGE_AUDIENCE, ALLOWED_TENANT_ROLES, DEFAULT_EXTERNAL_DESIGN_PRESET, createBridgeError y más.
import jwt from 'jsonwebtoken';
import { pool } from '../../db.js';
import { normalizeDisplayName, normalizeEmailInput } from '../mailer.js';

export const EXTERNAL_SOURCE = 'vase';
export const BRIDGE_ISSUER = process.env.VASE_BUSINESS_SSO_ISSUER || 'vase-app';
export const BRIDGE_AUDIENCE = process.env.VASE_BUSINESS_SSO_AUDIENCE || 'vase-business';
export const ALLOWED_TENANT_ROLES = new Set(['OWNER', 'MANAGER']);
export const DEFAULT_EXTERNAL_DESIGN_PRESET = 'generic';

export function createBridgeError(code, status = 400) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

export function getBridgeSecret() {
  const secret = String(process.env.VASE_BUSINESS_SSO_SECRET || '').trim();
  if (!secret) {
    throw createBridgeError('sso_secret_not_configured', 503);
  }
  return secret;
}

export function normalizeInternalRole(value) {
  return value === 'master_admin' ? 'master_admin' : 'tenant_admin';
}

export function normalizeTenantPresetText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeDesignPreset(value) {
  return normalizeTenantPresetText(value).replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getConfiguredTenantPreset(payload) {
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

export function getConfiguredTenantStaticSiteUrl(payload) {
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

export function resolvePayloadDesignPreset(rawPayload, normalizedPayload) {
  const explicitPreset = normalizeDesignPreset(
    rawPayload.design_preset ||
    rawPayload.tenant_design_preset ||
    rawPayload.editor_design_preset ||
    rawPayload.branding?.design_preset
  );
  if (explicitPreset) return explicitPreset;

  return getConfiguredTenantPreset(normalizedPayload) || null;
}

export function resolvePayloadStaticSiteUrl(rawPayload, normalizedPayload) {
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

export function buildDefaultTenantSettings(tenantName, designPreset = null, staticSiteUrl = '') {
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

export function normalizeLaunchPayload(rawPayload) {
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
