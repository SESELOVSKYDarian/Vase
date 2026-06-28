import { pool } from '../db.js';
import { normalizeDomainInput } from '../services/tenantDomains.js';

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function getApiHost(req) {
  return firstHeaderValue(
    req.get('x-original-host') ||
    req.get('x-forwarded-host') ||
    req.hostname ||
    req.get('host') ||
    ''
  );
}

export function resolveHostCandidates(req) {
  const rawHost = firstHeaderValue(req.get('x-storefront-host')) || getApiHost(req);
  const host = normalizeDomainInput(rawHost);
  if (!host) return [];

  return host.startsWith('www.')
    ? [host, host.slice(4)]
    : [host];
}

export async function resolveTenant(req, res, next) {
  try {
    const headerTenant = req.get('x-tenant-id');
    const queryTenant = req.query.tenantId;
    const bodyTenant = req.body?.tenant_id;
    const userTenant = req.user?.tenantId;

    const rawTenantId = headerTenant || queryTenant || bodyTenant || userTenant;
    let tenant;

    if (rawTenantId) {
      // Validate UUID to prevent DB crash
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const targetId = String(rawTenantId).trim();

      if (uuidRegex.test(targetId)) {
        const result = await pool.query(
          'select id, name, external_tenant_slug from tenants where id = $1 and status = $2',
          [targetId, 'active']
        );
        tenant = result.rows[0];
      }
    }

    if (!tenant) {
      const forwardedHost = firstHeaderValue(req.get('x-storefront-host')) || getApiHost(req);
      const hostCandidates = resolveHostCandidates(req);
      const host = hostCandidates[0] || '';
      if (hostCandidates.length) {
        console.log(
          `Tenant resolution by host: raw="${forwardedHost}" normalized="${host}" candidates=[${hostCandidates.join(', ')}] path="${req.path}"`
        );
        const result = await pool.query(
          [
            'select t.id, t.name, t.external_tenant_slug',
            'from tenant_domains d',
            'join tenants t on t.id = d.tenant_id',
            'where d.domain = any($1::text[]) and t.status = $2',
            'order by array_position($1::text[], d.domain) asc',
            'limit 1',
          ].join(' '),
          [hostCandidates, 'active']
        );
        tenant = result.rows[0];
        if (tenant) {
          console.log(`Tenant resolved by host "${host}": ${tenant.name} (${tenant.id})`);
        }
      }
    }

    if (!tenant) {
      const currentHost = getApiHost(req).toLowerCase();
      const isEditor = currentHost.startsWith('editor.');

      if (isEditor) {
        console.warn(`Editor host detected without tenant (${currentHost}). Rejecting ${req.path} with tenant_required.`);
        return res.status(400).json({ error: 'tenant_required' });
      }

      console.warn(`Tenant not found. headerTenant="${headerTenant || ''}" host="${currentHost}" path="${req.path}"`);
      return res.status(404).json({ error: 'tenant_not_found' });
    }

    console.log(`Resolved tenant: ${tenant.name} (${tenant.id})`);
    req.tenant = tenant;
    return next();
  } catch (err) {
    return next(err);
  }
}
