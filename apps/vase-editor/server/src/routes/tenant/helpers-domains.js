// Dominios de la tienda: validar, armar el plan de DNS, revisar la conexión y guardar o quitar dominios.
import { resolve4, resolveCname } from 'node:dns/promises';
import { slugify } from './helpers-common.js';

export function normalizeDomainInput(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function isValidDomain(value) {
  const normalized = normalizeDomainInput(value);
  if (!normalized) return false;
  if (normalized === 'localhost') return true;
  return /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(normalized);
}

export function normalizeSubdomainLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export function getPlatformDomainConfig() {
  const platformBaseDomain = String(process.env.PLATFORM_BASE_DOMAIN || '').trim().toLowerCase();
  const platformCnameTarget = String(
    process.env.PLATFORM_CNAME_TARGET ||
    process.env.PUBLIC_STOREFRONT_HOST ||
    'cname.vercel-dns.com'
  ).trim().toLowerCase();
  const platformApexIp = String(process.env.PLATFORM_APEX_IP || '76.76.21.21').trim();

  return {
    platformBaseDomain,
    platformCnameTarget,
    platformApexIp,
  };
}

export function inferDomainMode(domain, platformBaseDomain = '') {
  const normalized = normalizeDomainInput(domain);
  if (platformBaseDomain && normalized.endsWith(`.${platformBaseDomain}`)) return 'platform';
  return normalized.split('.').length > 2 ? 'subdomain' : 'apex';
}

export function buildDomainDnsPlan(domain, config) {
  const normalizedDomain = normalizeDomainInput(domain);
  const mode = inferDomainMode(normalizedDomain, config.platformBaseDomain);
  const labels = normalizedDomain.split('.');
  const rootDomain = labels.length > 2 ? labels.slice(-2).join('.') : normalizedDomain;
  const hostLabel = labels.length > 2 ? labels.slice(0, -2).join('.') : '@';

  if (mode === 'platform') {
    return {
      connection_type: 'platform',
      mode,
      root_domain: config.platformBaseDomain || normalizedDomain,
      host_label: normalizedDomain.replace(`.${config.platformBaseDomain}`, ''),
      required_records: [],
      dns_hint: 'No requiere configuracion DNS manual. La plataforma publica y protege este subdominio.',
    };
  }

  if (mode === 'subdomain') {
    return {
      connection_type: 'custom',
      mode,
      root_domain: rootDomain,
      host_label: hostLabel,
      required_records: [
        {
          type: 'CNAME',
          host: hostLabel || normalizedDomain,
          value: config.platformCnameTarget,
          ttl: 'Auto',
        },
      ],
      dns_hint: `Configura un CNAME para ${hostLabel || normalizedDomain} apuntando a ${config.platformCnameTarget}.`,
    };
  }

  return {
    connection_type: 'custom',
    mode,
    root_domain: normalizedDomain,
    host_label: '@',
    required_records: [
      {
        type: 'A',
        host: '@',
        value: config.platformApexIp,
        ttl: 'Auto',
      },
      {
        type: 'CNAME',
        host: 'www',
        value: config.platformCnameTarget,
        ttl: 'Auto',
      },
    ],
    dns_hint: `Apunta el dominio raiz a ${config.platformApexIp} y, si quieres usar www, agrega un CNAME hacia ${config.platformCnameTarget}.`,
  };
}

export async function resolveDnsWithFallback(resolveFn, domain) {
  try {
    const result = await Promise.race([
      resolveFn(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('dns_timeout')), 2500)),
    ]);
    return Array.isArray(result) ? result.map((item) => normalizeDomainInput(item)) : [];
  } catch (err) {
    return [];
  }
}

export async function inspectDomainConnection(domain, config) {
  const normalizedDomain = normalizeDomainInput(domain);
  const plan = buildDomainDnsPlan(normalizedDomain, config);
  const checkedAt = new Date().toISOString();

  if (plan.connection_type === 'platform') {
    return {
      status: 'active',
      label: 'Activo',
      message: 'El subdominio pertenece a la plataforma y queda listo apenas se guarda.',
      last_checked_at: checkedAt,
      observed_records: {
        a: [],
        cname: [],
      },
    };
  }

  const [aRecords, cnameRecords] = await Promise.all([
    resolveDnsWithFallback(resolve4, normalizedDomain),
    resolveDnsWithFallback(resolveCname, normalizedDomain),
  ]);

  const matchesA = aRecords.includes(config.platformApexIp);
  const matchesCname = cnameRecords.includes(config.platformCnameTarget);
  const hasAnyRecord = aRecords.length > 0 || cnameRecords.length > 0;

  if (matchesA || matchesCname) {
    return {
      status: 'active',
      label: 'Activo',
      message: 'El DNS ya apunta a la plataforma. Falta solo que termine de propagarse el certificado SSL si todavia no aparece en vivo.',
      last_checked_at: checkedAt,
      observed_records: {
        a: aRecords,
        cname: cnameRecords,
      },
    };
  }

  if (hasAnyRecord) {
    return {
      status: 'attention',
      label: 'Revisar',
      message: 'Detectamos DNS publicados, pero no apuntan a los valores esperados para esta tienda.',
      last_checked_at: checkedAt,
      observed_records: {
        a: aRecords,
        cname: cnameRecords,
      },
    };
  }

  return {
    status: 'dns_pending',
    label: 'DNS pendiente',
    message: plan.dns_hint,
    last_checked_at: checkedAt,
    observed_records: {
      a: aRecords,
      cname: cnameRecords,
    },
  };
}


export async function listTenantDomains(db, tenantId) {
  const result = await db.query(
    [
      'select domain, is_primary, created_at',
      'from tenant_domains',
      'where tenant_id = $1',
      'order by is_primary desc, created_at asc, domain asc',
    ].join(' '),
    [tenantId]
  );

  return result.rows;
}

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
