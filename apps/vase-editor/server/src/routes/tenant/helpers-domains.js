// El código está repartido por tema en la carpeta helpers-domains/. Este archivo solo lo junta.
// partes: ./helpers-domains/inspect-domain-connection.js, ./helpers-domains/upsert-tenant-domain.js
export { normalizeDomainInput, isValidDomain, normalizeSubdomainLabel, getPlatformDomainConfig, inferDomainMode, buildDomainDnsPlan, resolveDnsWithFallback, inspectDomainConnection, listTenantDomains } from './helpers-domains/inspect-domain-connection.js';
export { buildTenantDomainsPayload, upsertTenantDomain, removeTenantDomain } from './helpers-domains/upsert-tenant-domain.js';
