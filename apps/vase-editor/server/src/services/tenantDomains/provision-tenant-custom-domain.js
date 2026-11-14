// Parte de tenantDomains.js: provisionTenantCustomDomain.
import { provisionCustomDomainDns } from '../domainProvisioning.js';
import { getPlatformDomainConfig, inferDomainMode, normalizeDomainInput } from './find-available-platform-domain.js';
import { persistDomainProvisioningState } from './inspect-domain-connection.js';
import { buildTenantDomainsPayload } from './build-tenant-domains-payload.js';

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
