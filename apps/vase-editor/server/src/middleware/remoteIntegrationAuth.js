import { pool } from '../db.js';
import { normalizeDomainInput } from '../services/tenantDomains.js';
import {
  buildRemoteCredentialIntrospectionRequest,
  readRemoteCredentialIntrospectionBaseUrl,
} from './remoteIntegrationAuth.shared.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function getRequestBody(req) {
  return req?.body && typeof req.body === 'object' ? req.body : {};
}

function getRequestHost(req) {
  return firstHeaderValue(
    req.get?.('x-storefront-host') ||
    req.get?.('x-original-host') ||
    req.get?.('x-forwarded-host') ||
    req.hostname ||
    req.get?.('host') ||
    ''
  );
}

async function resolveTenantSlugFromTenantId(tenantId) {
  const normalizedTenantId = String(tenantId || '').trim();
  if (!UUID_REGEX.test(normalizedTenantId)) {
    return '';
  }

  const result = await pool.query(
    [
      'select external_tenant_slug',
      'from tenants',
      'where id = $1 and status = $2',
      'limit 1',
    ].join(' '),
    [normalizedTenantId, 'active']
  );

  return String(result.rows[0]?.external_tenant_slug || '').trim().toLowerCase();
}

async function resolveTenantSlugFromHost(req) {
  const normalizedHost = normalizeDomainInput(getRequestHost(req));
  if (!normalizedHost) {
    return '';
  }

  const hostCandidates = normalizedHost.startsWith('www.')
    ? [normalizedHost, normalizedHost.slice(4)]
    : [normalizedHost];

  const result = await pool.query(
    [
      'select t.external_tenant_slug',
      'from tenant_domains d',
      'join tenants t on t.id = d.tenant_id',
      'where d.domain = any($1::text[]) and t.status = $2',
      'order by array_position($1::text[], d.domain) asc',
      'limit 1',
    ].join(' '),
    [hostCandidates, 'active']
  );

  if (result.rows[0]?.external_tenant_slug) {
    return String(result.rows[0].external_tenant_slug).trim().toLowerCase();
  }

  const hostSlug = normalizedHost.split('.')[0] || '';
  if (!hostSlug || ['business', 'localhost'].includes(hostSlug)) {
    return '';
  }

  return hostSlug.toLowerCase();
}

export async function resolveRemoteCredentialTenantSlug(req) {
  const body = getRequestBody(req);
  const explicitSlug = String(
    req.get?.('x-tenant-slug') ||
    req.query?.tenant_slug ||
    req.query?.tenantSlug ||
    body.tenant_slug ||
    body.tenantSlug ||
    ''
  ).trim().toLowerCase();

  if (explicitSlug) {
    return explicitSlug;
  }

  const tenantId = String(
    req.get?.('x-tenant-id') ||
    req.tenantId ||
    body.tenant_id ||
    req.query?.tenant_id ||
    ''
  ).trim();

  const slugFromTenantId = await resolveTenantSlugFromTenantId(tenantId);
  if (slugFromTenantId) {
    return slugFromTenantId;
  }

  return resolveTenantSlugFromHost(req);
}

export async function introspectRemoteIntegrationCredential({
  req,
  token,
  scope,
  consumerSecret = null,
}) {
  const tenantSlug = await resolveRemoteCredentialTenantSlug(req);
  const baseUrl = readRemoteCredentialIntrospectionBaseUrl();
  const serviceToken = String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim();

  if (!tenantSlug || !baseUrl || !serviceToken) {
    return null;
  }

  const response = await fetch(
    `${baseUrl}/api/internal/business/integrations/credentials`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${serviceToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(
        buildRemoteCredentialIntrospectionRequest({
          tenantSlug,
          token,
          scope,
          consumerSecret,
        })
      ),
    }
  );

  if (response.ok) {
    return response.json();
  }

  if ([401, 403, 404].includes(response.status)) {
    return null;
  }

  const error = new Error(`remote_integration_auth_failed:${response.status}`);
  error.status = response.status;
  error.detail = await response.text();
  throw error;
}
