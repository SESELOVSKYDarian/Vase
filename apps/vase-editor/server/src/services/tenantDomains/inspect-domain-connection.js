// Parte de tenantDomains.js: buildDomainDnsPlan, inspectDomainConnection, listTenantDomains, persistDomainProvisioningState, persistDomainVerificationState.
import { resolve4, resolveCname } from 'node:dns/promises';
import { getVercelProjectDomainStatus } from '../vercelDomains.js';
import { getPlatformDomainConfig, inferDomainMode, normalizeDomainInput, resolveDnsWithFallback } from './find-available-platform-domain.js';

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

export async function persistDomainProvisioningState(db, tenantId, domain, provisioning = {}) {
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

export async function persistDomainVerificationState(db, tenantId, domain, verification = {}) {
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
