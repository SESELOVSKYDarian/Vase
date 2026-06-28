function normalizeIdentity(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeDomains(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').toLowerCase());
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeDomains(parsed);
    } catch {
      return [value.toLowerCase()];
    }
  }
  return [];
}

function hasTeflonIdentity(row = {}) {
  const identity = normalizeIdentity([
    row.name,
    row.external_tenant_slug,
    row.external_source,
    ...normalizeDomains(row.domains),
  ].join(' '));

  return identity.includes('teflon') || identity.includes('sanitarios el teflon');
}

function hasPiquimIdentity(row = {}) {
  const identity = normalizeIdentity([
    row.name,
    row.external_tenant_slug,
    ...normalizeDomains(row.domains),
  ].join(' '));

  return identity.includes('piquim') || identity.includes('piquin');
}

function isExternalCandidate(row = {}, fallbackTenantId = '') {
  const id = String(row.id || '').trim();
  if (!id || id === fallbackTenantId) return false;
  return row.external_source === 'vase' || Boolean(String(row.external_tenant_slug || '').trim());
}

export function selectTeflonBootstrapTargetTenant(rows = [], fallbackTenantId = '') {
  const candidates = rows.filter((row) => hasTeflonIdentity(row) && !hasPiquimIdentity(row));
  const external = candidates.find((row) => isExternalCandidate(row, fallbackTenantId));
  if (external) return external;

  return candidates.find((row) => String(row.id || '').trim() === fallbackTenantId) || candidates[0] || null;
}
