import { resolve4, resolveCname } from 'node:dns/promises';
import {
  getVercelProjectDomainStatus,
  removeVercelProjectDomain,
  upsertVercelProjectDomain,
} from './vercelDomains.js';
import { provisionCustomDomainDns } from './domainProvisioning.js';

const RESERVED_PLATFORM_LABELS = new Set([
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

function slugify(value) {
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

function sanitizeAutomaticPlatformLabel(value) {
  const normalized = normalizeSubdomainLabel(slugify(value));
  if (!normalized) return '';
  if (RESERVED_PLATFORM_LABELS.has(normalized)) {
    return `${normalized}-site`;
  }
  return normalized;
}

function extractEmailLocalPart(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email.includes('@')) return '';
  return email.split('@')[0] || '';
}

function extractPlatformSubdomain(domain, platformBaseDomain) {
  const normalizedDomain = normalizeDomainInput(domain);
  const normalizedBaseDomain = normalizeDomainInput(platformBaseDomain);
  if (!normalizedDomain || !normalizedBaseDomain) return null;
  const suffix = `.${normalizedBaseDomain}`;
  if (!normalizedDomain.endsWith(suffix)) return null;
  return normalizedDomain.slice(0, -suffix.length) || null;
}

function createPlatformDomain(domainLabel, platformBaseDomain) {
  const subdomain = normalizeSubdomainLabel(domainLabel);
  const baseDomain = normalizeDomainInput(platformBaseDomain);
  if (!subdomain || !baseDomain) return null;
  return `${subdomain}.${baseDomain}`;
}

async function runWithTransaction(db, callback) {
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

async function resolveDnsWithFallback(resolveFn, domain) {
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

async function getTenantDomainContext(db, tenantId) {
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

function buildAutomaticPlatformCandidates(context = {}, options = {}) {
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

async function findAvailablePlatformDomain(db, tenantId, context, options = {}) {
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

function buildPlatformSuggestedSubdomain(context, assignedSubdomain = null) {
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

export function buildDomainDnsPlan(domain, config = getPlatformDomainConfig(), options = {}) {
  const normalizedDomain = normalizeDomainInput(domain);
  const mode = inferDomainMode(normalizedDomain, config.platformBaseDomain);
  const labels = normalizedDomain.split('.');
  const rootDomain = labels.length > 2 ? labels.slice(-2).join('.') : normalizedDomain;
  const hostLabel = labels.length > 2 ? labels.slice(0, -2).join('.') : '@';
  const cnameTarget = normalizeDomainInput(options.cnameTarget || config.platformCnameTarget) || 'tu-host-de-publicacion';
  const apexIp = config.platformApexIp || 'tu-ip-publica';

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
          value: cnameTarget,
          ttl: 'Auto',
        },
      ],
      dns_hint: `Configura un CNAME para ${hostLabel || normalizedDomain} apuntando a ${cnameTarget}.`,
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
        value: apexIp,
        ttl: 'Auto',
      },
      {
        type: 'CNAME',
        host: 'www',
        value: cnameTarget,
        ttl: 'Auto',
      },
    ],
    dns_hint: `Apunta el dominio raiz a ${apexIp} y, si quieres usar www, agrega un CNAME hacia ${cnameTarget}.`,
  };
}

export async function inspectDomainConnection(domain, config = getPlatformDomainConfig(), options = {}) {
  const normalizedDomain = normalizeDomainInput(domain);
  const plan = buildDomainDnsPlan(normalizedDomain, config, options);
  const checkedAt = new Date().toISOString();

  if (plan.connection_type === 'platform') {
    return {
      status: 'active',
      label: 'Activo',
      message: 'El subdominio pertenece a la plataforma y queda listo apenas se guarda.',
      last_checked_at: checkedAt,
      vercel: {
        enabled: false,
        status: 'not_required',
        verified: true,
      },
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

  const expectedCnameTargets = Array.isArray(options.expectedCnameTargets)
    ? options.expectedCnameTargets.map((item) => normalizeDomainInput(item)).filter(Boolean)
    : [normalizeDomainInput(options.cnameTarget || config.platformCnameTarget)].filter(Boolean);
  const matchesA = Boolean(config.platformApexIp) && aRecords.includes(config.platformApexIp);
  const matchesCname = expectedCnameTargets.some((target) => cnameRecords.includes(target));
  const hasAnyRecord = aRecords.length > 0 || cnameRecords.length > 0;

  const vercelState = await getVercelProjectDomainStatus(normalizedDomain);
  const vercelVerified = vercelState?.verified === true;
  const vercelRequired = vercelState?.enabled === true;
  const dnsReady = matchesA || matchesCname;

  if (dnsReady && vercelVerified) {
    return {
      status: 'active',
      label: 'Activo',
      message: vercelRequired
        ? 'El DNS apunta correctamente y Vercel verifico el dominio. SSL deberia quedar activo al finalizar propagacion.'
        : 'El DNS apunta correctamente a la plataforma.',
      last_checked_at: checkedAt,
      vercel: vercelState,
      observed_records: {
        a: aRecords,
        cname: cnameRecords,
      },
    };
  }

  if (dnsReady && vercelRequired && !vercelVerified) {
    return {
      status: 'attention',
      label: 'Revisar',
      message: 'El DNS ya apunta a la plataforma, pero Vercel todavia no verifico el dominio.',
      last_checked_at: checkedAt,
      vercel: vercelState,
      observed_records: {
        a: aRecords,
        cname: cnameRecords,
      },
    };
  }

  if (!dnsReady && vercelRequired && vercelVerified) {
    return {
      status: 'attention',
      label: 'Revisar',
      message: 'Vercel verifico el dominio, pero los registros DNS aun no apuntan a los valores esperados.',
      last_checked_at: checkedAt,
      vercel: vercelState,
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
      message: 'Detectamos DNS publicados, pero no apuntan a los valores esperados para este sitio.',
      last_checked_at: checkedAt,
      vercel: vercelState,
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
    vercel: vercelState,
    observed_records: {
      a: aRecords,
      cname: cnameRecords,
    },
  };
}

export async function listTenantDomains(db, tenantId) {
  const result = await db.query(
    [
      'select domain, is_primary, created_at, vercel_status, vercel_payload, vercel_checked_at, provisioning_status, provisioning_payload, provisioning_checked_at',
      'from tenant_domains',
      'where tenant_id = $1',
      'order by is_primary desc, created_at asc, domain asc',
    ].join(' '),
    [tenantId]
  );

  return result.rows;
}

async function persistDomainProvisioningState(db, tenantId, domain, provisioning = {}) {
  const status = String(provisioning?.status || '').trim() || null;
  const payload = provisioning ? JSON.stringify(provisioning) : null;
  const checkedAt = provisioning?.checked_at || null;
  await db.query(
    [
      'update tenant_domains',
      'set provisioning_status = $3,',
      'provisioning_payload = case when $4::text is null then null else $4::jsonb end,',
      'provisioning_checked_at = case when $5::timestamptz is null then null else $5::timestamptz end',
      'where tenant_id = $1 and domain = $2',
    ].join(' '),
    [tenantId, domain, status, payload, checkedAt]
  );
}

async function persistDomainVerificationState(db, tenantId, domain, verification = {}) {
  const vercelStatus = String(verification?.vercel?.status || '').trim() || null;
  const vercelPayload = verification?.vercel ? JSON.stringify(verification.vercel) : null;
  const checkedAt = verification?.vercel?.checked_at || verification?.last_checked_at || null;
  await db.query(
    [
      'update tenant_domains',
      'set vercel_status = $3,',
      'vercel_payload = case when $4::text is null then null else $4::jsonb end,',
      'vercel_checked_at = case when $5::timestamptz is null then null else $5::timestamptz end',
      'where tenant_id = $1 and domain = $2',
    ].join(' '),
    [tenantId, domain, vercelStatus, vercelPayload, checkedAt]
  );
}

export async function buildTenantDomainsPayload(db, tenantId, options = {}) {
  const context = options?.context || await getTenantDomainContext(db, tenantId);
  const platformConfig = getPlatformDomainConfig();

  if (options.ensurePlatformDomain && platformConfig.platformBaseDomain) {
    const existingDomains = await listTenantDomains(db, tenantId);
    const existingPlatformDomain = existingDomains.find(
      (item) => inferDomainMode(item.domain, platformConfig.platformBaseDomain) === 'platform'
    );
    if (!existingPlatformDomain) {
      await ensureTenantPlatformDomain(db, tenantId, {
        ...options.autoCreateOptions,
        context,
        existingDomains,
        onlyWhenMissing: false,
      });
    }
  }

  const domains = await listTenantDomains(db, tenantId);
  const primaryDomain = domains.find((item) => item.is_primary)?.domain || null;
  const platformDomain = domains.find((item) => inferDomainMode(item.domain, platformConfig.platformBaseDomain) === 'platform') || null;
  const assignedPlatformDomain = platformDomain?.domain || null;
  const assignedPlatformSubdomain = extractPlatformSubdomain(assignedPlatformDomain, platformConfig.platformBaseDomain);
  const suggestedSubdomain = buildPlatformSuggestedSubdomain(context, assignedPlatformSubdomain);
  const tenantCnameTarget = normalizeDomainInput(
    assignedPlatformDomain ||
    platformConfig.platformCnameTarget
  );

  const enrichedDomains = await Promise.all(
    domains.map(async (item) => {
      const plan = buildDomainDnsPlan(item.domain, platformConfig, {
        cnameTarget: tenantCnameTarget,
      });
      const verification = await inspectDomainConnection(item.domain, platformConfig, {
        cnameTarget: tenantCnameTarget,
        expectedCnameTargets: [tenantCnameTarget, platformConfig.platformCnameTarget],
      });
      await persistDomainVerificationState(db, tenantId, item.domain, verification);
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
      cname_target: tenantCnameTarget || null,
      apex_ip: platformConfig.platformApexIp || null,
      assigned_domain: assignedPlatformDomain,
      assigned_subdomain: assignedPlatformSubdomain,
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

  await runWithTransaction(db, async (client) => {
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
        [
          'insert into tenant_domains (tenant_id, domain, is_primary, vercel_status, vercel_payload, vercel_checked_at, provisioning_status, provisioning_payload, provisioning_checked_at)',
          'values ($1, $2, $3, null, null, null, null, null, null)',
        ].join(' '),
        [tenantId, normalizedDomain, isPrimary]
      );
    }
  });

  const domainMode = inferDomainMode(normalizedDomain, getPlatformDomainConfig().platformBaseDomain);
  if (domainMode !== 'platform') {
    if (String(process.env.AUTO_PROVISION_CUSTOM_DOMAINS || '').trim().toLowerCase() === 'true') {
      try {
        const provisioning = await provisionCustomDomainDns(normalizedDomain, {
          apexIp: getPlatformDomainConfig().platformApexIp,
        });
        await persistDomainProvisioningState(db, tenantId, normalizedDomain, provisioning);
      } catch (err) {
        console.warn(`Could not provision DNS for ${normalizedDomain}:`, err?.message || err);
      }
    }

    try {
      const vercelState = await upsertVercelProjectDomain(normalizedDomain);
      await persistDomainVerificationState(db, tenantId, normalizedDomain, {
        last_checked_at: vercelState?.checked_at,
        vercel: vercelState,
      });
    } catch (err) {
      console.warn(`Could not upsert domain ${normalizedDomain} in Vercel:`, err?.message || err);
    }
  }

  return buildTenantDomainsPayload(db, tenantId);
}

export async function removeTenantDomain(db, tenantId, domain, options = {}) {
  const normalizedDomain = normalizeDomainInput(domain);

  await runWithTransaction(db, async (client) => {
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

    const mode = inferDomainMode(normalizedDomain, getPlatformDomainConfig().platformBaseDomain);
    if (mode !== 'platform') {
      try {
        await removeVercelProjectDomain(normalizedDomain);
      } catch (err) {
        console.warn(`Could not remove domain ${normalizedDomain} from Vercel:`, err?.message || err);
      }
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
  });

  return buildTenantDomainsPayload(db, tenantId, options);
}

export async function ensureTenantPlatformDomain(db, tenantId, options = {}) {
  const config = getPlatformDomainConfig();
  if (!config.platformBaseDomain) {
    return null;
  }

  const context = options?.context || await getTenantDomainContext(db, tenantId);
  const existingDomains = options?.existingDomains || await listTenantDomains(db, tenantId);
  const existingPlatformDomain = existingDomains.find(
    (item) => inferDomainMode(item.domain, config.platformBaseDomain) === 'platform'
  );

  if (existingPlatformDomain) {
    if (options.isPrimary === true && existingPlatformDomain.is_primary !== true) {
      await upsertTenantDomain(db, tenantId, existingPlatformDomain.domain, {
        isPrimary: true,
      });
    }
    return {
      created: false,
      domain: existingPlatformDomain.domain,
      subdomain: extractPlatformSubdomain(existingPlatformDomain.domain, config.platformBaseDomain),
    };
  }

  const onlyWhenMissing = options.onlyWhenMissing !== false;
  if (onlyWhenMissing && existingDomains.length) {
    return null;
  }

  const available = await findAvailablePlatformDomain(db, tenantId, context, options);
  if (!available) {
    return null;
  }

  await upsertTenantDomain(db, tenantId, available.domain, {
    isPrimary: options.isPrimary ?? existingDomains.length === 0,
  });

  return {
    created: true,
    domain: available.domain,
    subdomain: available.subdomain,
  };
}

export async function provisionTenantCustomDomain(db, tenantId, domain) {
  const normalizedDomain = normalizeDomainInput(domain);
  const mode = inferDomainMode(normalizedDomain, getPlatformDomainConfig().platformBaseDomain);
  if (!normalizedDomain || mode === 'platform') {
    const error = new Error('invalid_custom_domain');
    error.status = 400;
    error.code = 'invalid_custom_domain';
    throw error;
  }

  const exists = await db.query(
    'select domain from tenant_domains where tenant_id = $1 and domain = $2 limit 1',
    [tenantId, normalizedDomain]
  );
  if (!exists.rowCount) {
    const error = new Error('domain_not_found');
    error.status = 404;
    error.code = 'domain_not_found';
    throw error;
  }

  const provisioning = await provisionCustomDomainDns(normalizedDomain, {
    apexIp: getPlatformDomainConfig().platformApexIp,
  });
  await persistDomainProvisioningState(db, tenantId, normalizedDomain, provisioning);

  return buildTenantDomainsPayload(db, tenantId, {
    ensurePlatformDomain: true,
    autoCreateOptions: { onlyWhenMissing: false },
  });
}
