// Parte de tenantDomains.js: buildTenantDomainsPayload, upsertTenantDomain, removeTenantDomain, ensureTenantPlatformDomain.
import { removeVercelProjectDomain, upsertVercelProjectDomain } from '../vercelDomains.js';
import { provisionCustomDomainDns } from '../domainProvisioning.js';
import { buildPlatformSuggestedSubdomain, extractPlatformSubdomain, findAvailablePlatformDomain, getPlatformDomainConfig, getTenantDomainContext, inferDomainMode, isValidDomain, normalizeDomainInput, runWithTransaction } from './find-available-platform-domain.js';
import { buildDomainDnsPlan, inspectDomainConnection, listTenantDomains, persistDomainProvisioningState, persistDomainVerificationState } from './inspect-domain-connection.js';

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
