// Parte de helpers-domains.js: buildTenantDomainsPayload, upsertTenantDomain, removeTenantDomain.
import { slugify } from '../helpers-common.js';
import { buildDomainDnsPlan, getPlatformDomainConfig, inspectDomainConnection, isValidDomain, listTenantDomains, normalizeDomainInput, normalizeSubdomainLabel } from './inspect-domain-connection.js';

export async function buildTenantDomainsPayload(db, tenantId) {
  const tenantRes = await db.query(
    [
      'select t.name, ts.branding',
      'from tenants t',
      'left join tenant_settings ts on ts.tenant_id = t.id',
      'where t.id = $1',
      'limit 1',
    ].join(' '),
    [tenantId]
  );

  const tenant = tenantRes.rows[0] || {};
  const brandingName = String(tenant?.branding?.name || tenant?.name || 'mi-tienda').trim();
  const suggestedSubdomain = normalizeSubdomainLabel(slugify(brandingName) || 'mi-tienda');
  const domains = await listTenantDomains(db, tenantId);
  const primaryDomain = domains.find((item) => item.is_primary)?.domain || null;
  const platformConfig = getPlatformDomainConfig();
  const enrichedDomains = await Promise.all(
    domains.map(async (item) => {
      const plan = buildDomainDnsPlan(item.domain, platformConfig);
      const verification = await inspectDomainConnection(item.domain, platformConfig);
      return {
        ...item,
        ...plan,
        verification,
      };
    })
  );
  const summary = enrichedDomains.reduce(
    (acc, item) => {
      acc.connected += 1;
      if (item.verification?.status === 'active') acc.active += 1;
      else if (item.verification?.status === 'attention') acc.attention += 1;
      else acc.pending += 1;
      return acc;
    },
    { connected: 0, active: 0, attention: 0, pending: 0 }
  );

  return {
    tenant_id: tenantId,
    primary_domain: primaryDomain,
    domains: enrichedDomains,
    summary,
    platform: {
      enabled: Boolean(platformConfig.platformBaseDomain),
      base_domain: platformConfig.platformBaseDomain || null,
      cname_target: platformConfig.platformCnameTarget || null,
      apex_ip: platformConfig.platformApexIp || null,
      suggested_subdomain: suggestedSubdomain,
      suggested_domain: platformConfig.platformBaseDomain ? `${suggestedSubdomain}.${platformConfig.platformBaseDomain}` : null,
    },
  };
}

export async function upsertTenantDomain(db, tenantId, domain, { isPrimary = true } = {}) {
  const normalizedDomain = normalizeDomainInput(domain);
  if (!isValidDomain(normalizedDomain)) {
    const error = new Error('invalid_domain');
    error.status = 400;
    error.code = 'invalid_domain';
    throw error;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existingDomainRes = await client.query(
      'select tenant_id from tenant_domains where domain = $1 limit 1',
      [normalizedDomain]
    );

    if (existingDomainRes.rowCount && existingDomainRes.rows[0].tenant_id !== tenantId) {
      const error = new Error('domain_in_use');
      error.status = 409;
      error.code = 'domain_in_use';
      throw error;
    }

    if (isPrimary) {
      await client.query(
        'update tenant_domains set is_primary = false where tenant_id = $1',
        [tenantId]
      );
    }

    if (existingDomainRes.rowCount) {
      await client.query(
        [
          'update tenant_domains',
          'set is_primary = $3',
          'where tenant_id = $1 and domain = $2',
        ].join(' '),
        [tenantId, normalizedDomain, isPrimary]
      );
    } else {
      await client.query(
        'insert into tenant_domains (tenant_id, domain, is_primary) values ($1, $2, $3)',
        [tenantId, normalizedDomain, isPrimary]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return buildTenantDomainsPayload(db, tenantId);
}

export async function removeTenantDomain(db, tenantId, domain) {
  const normalizedDomain = normalizeDomainInput(domain);
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query(
      'select domain, is_primary from tenant_domains where tenant_id = $1 and domain = $2 limit 1',
      [tenantId, normalizedDomain]
    );

    if (!currentRes.rowCount) {
      const error = new Error('domain_not_found');
      error.status = 404;
      error.code = 'domain_not_found';
      throw error;
    }

    await client.query(
      'delete from tenant_domains where tenant_id = $1 and domain = $2',
      [tenantId, normalizedDomain]
    );

    if (currentRes.rows[0].is_primary) {
      await client.query(
        [
          'with next_domain as (',
          'select domain from tenant_domains where tenant_id = $1 order by created_at asc, domain asc limit 1',
          ')',
          'update tenant_domains set is_primary = true',
          'where tenant_id = $1 and domain = (select domain from next_domain)',
        ].join(' '),
        [tenantId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return buildTenantDomainsPayload(db, tenantId);
}
