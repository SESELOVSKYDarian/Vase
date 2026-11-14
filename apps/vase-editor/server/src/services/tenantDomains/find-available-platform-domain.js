// Parte de tenantDomains.js: RESERVED_PLATFORM_LABELS, slugify, normalizeDomainInput, isValidDomain, normalizeSubdomainLabel, sanitizeAutomaticPlatformLabel y más.

export const RESERVED_PLATFORM_LABELS = new Set([
  'admin',
  'api',
  'app',
  'editor',
  'ftp',
  'mail',
  'root',
  'support',
  'www',
]);

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

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
    .replace(/--+/g, '-')
    .slice(0, 63)
    .replace(/-+$/, '');
}

export function sanitizeAutomaticPlatformLabel(value) {
  const normalized = normalizeSubdomainLabel(slugify(value));
  if (!normalized) return '';
  if (RESERVED_PLATFORM_LABELS.has(normalized)) {
    return `${normalized}-site`;
  }
  return normalized;
}

export function extractEmailLocalPart(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email.includes('@')) return '';
  return email.split('@')[0] || '';
}

export function extractPlatformSubdomain(domain, platformBaseDomain) {
  const normalizedDomain = normalizeDomainInput(domain);
  const normalizedBaseDomain = normalizeDomainInput(platformBaseDomain);
  if (!normalizedDomain || !normalizedBaseDomain) return null;
  const suffix = `.${normalizedBaseDomain}`;
  if (!normalizedDomain.endsWith(suffix)) return null;
  return normalizedDomain.slice(0, -suffix.length) || null;
}

export function createPlatformDomain(domainLabel, platformBaseDomain) {
  const subdomain = normalizeSubdomainLabel(domainLabel);
  const baseDomain = normalizeDomainInput(platformBaseDomain);
  if (!subdomain || !baseDomain) return null;
  return `${subdomain}.${baseDomain}`;
}

export async function runWithTransaction(db, callback) {
  if (typeof db?.release === 'function') {
    return callback(db);
  }

  if (typeof db?.connect === 'function') {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return callback(db);
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

export async function getTenantDomainContext(db, tenantId) {
  const tenantRes = await db.query(
    [
      'select t.name, t.external_tenant_slug, ts.branding',
      'from tenants t',
      'left join tenant_settings ts on ts.tenant_id = t.id',
      'where t.id = $1',
      'limit 1',
    ].join(' '),
    [tenantId]
  );

  const tenant = tenantRes.rows[0] || {};
  return {
    tenantName: String(tenant?.name || '').trim(),
    externalTenantSlug: String(tenant?.external_tenant_slug || '').trim(),
    brandingName: String(tenant?.branding?.name || '').trim(),
  };
}

export function buildAutomaticPlatformCandidates(context = {}, options = {}) {
  const candidateValues = [
    options?.preferredSubdomain,
    ...(Array.isArray(options?.preferredLabels) ? options.preferredLabels : []),
    context.externalTenantSlug,
    extractEmailLocalPart(options?.email),
    context.brandingName,
    context.tenantName,
    'sitio',
  ];

  const unique = new Set();
  for (const value of candidateValues) {
    const candidate = sanitizeAutomaticPlatformLabel(value);
    if (candidate) {
      unique.add(candidate);
    }
  }

  if (!unique.size) {
    unique.add('sitio');
  }

  return Array.from(unique);
}

export async function findAvailablePlatformDomain(db, tenantId, context, options = {}) {
  const config = getPlatformDomainConfig();
  if (!config.platformBaseDomain) return null;

  const baseCandidates = buildAutomaticPlatformCandidates(context, options);
  for (const baseLabel of baseCandidates) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const subdomain = attempt === 0 ? baseLabel : `${baseLabel}-${attempt + 2}`;
      const domain = createPlatformDomain(subdomain, config.platformBaseDomain);
      if (!domain) continue;

      const existingRes = await db.query(
        'select tenant_id from tenant_domains where domain = $1 limit 1',
        [domain]
      );

      if (!existingRes.rowCount || existingRes.rows[0].tenant_id === tenantId) {
        return {
          subdomain,
          domain,
        };
      }
    }
  }

  return null;
}

export function buildPlatformSuggestedSubdomain(context, assignedSubdomain = null) {
  if (assignedSubdomain) {
    return assignedSubdomain;
  }
  const candidates = buildAutomaticPlatformCandidates(context);
  return candidates[0] || 'sitio';
}

export function getPlatformDomainConfig() {
  const platformBaseDomain = normalizeDomainInput(process.env.PLATFORM_BASE_DOMAIN || '');
  const platformCnameTarget = normalizeDomainInput(
    process.env.PLATFORM_CNAME_TARGET ||
    process.env.PUBLIC_STOREFRONT_HOST ||
    process.env.PUBLIC_EDITOR_HOST ||
    ''
  );
  const platformApexIp = String(process.env.PLATFORM_APEX_IP || '').trim();

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
