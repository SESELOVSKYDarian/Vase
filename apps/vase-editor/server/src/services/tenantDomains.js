// El código está repartido por tema en la carpeta tenantDomains/. Este archivo solo lo junta.
// partes: ./tenantDomains/find-available-platform-domain.js, ./tenantDomains/inspect-domain-connection.js, ./tenantDomains/build-tenant-domains-payload.js, ./tenantDomains/provision-tenant-custom-domain.js
export { normalizeDomainInput, isValidDomain, normalizeSubdomainLabel, getPlatformDomainConfig, inferDomainMode } from './tenantDomains/find-available-platform-domain.js';
export { buildDomainDnsPlan, inspectDomainConnection, listTenantDomains } from './tenantDomains/inspect-domain-connection.js';
export { buildTenantDomainsPayload, upsertTenantDomain, removeTenantDomain, ensureTenantPlatformDomain } from './tenantDomains/build-tenant-domains-payload.js';
export { provisionTenantCustomDomain } from './tenantDomains/provision-tenant-custom-domain.js';
