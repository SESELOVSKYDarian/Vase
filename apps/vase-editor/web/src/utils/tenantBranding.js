export const PIQUIM_DESIGN_PRESET = 'piquim';
export const GENERIC_DESIGN_PRESET = 'generic';
export const DEFAULT_NON_PIQUIM_DESIGN_PRESET = GENERIC_DESIGN_PRESET;

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const resolveRawDesignPreset = (settings = {}) => normalizeText(settings?.branding?.design_preset);

export const isPiquimTenantIdentity = ({ settings = {} } = {}) =>
  resolveRawDesignPreset(settings) === PIQUIM_DESIGN_PRESET;

const isExternalTenant = (tenant = {}) =>
  Boolean(String(tenant?.external_tenant_slug || tenant?.externalTenantSlug || '').trim());

const isKnownStaleBrandName = (value) => {
  const normalized = normalizeText(value);
  return normalized.includes('sanitarios') || normalized.includes('teflon');
};

export const resolveTenantBrandName = ({ tenant = {}, settings = {}, fallback = 'Vase Business' } = {}) => {
  const tenantName = String(tenant?.name || '').trim();
  const brandingName = String(settings?.branding?.name || '').trim();
  const piquim = isPiquimTenantIdentity({ tenant, settings });

  if (!piquim && tenantName && isExternalTenant(tenant) && isKnownStaleBrandName(brandingName)) {
    return tenantName || fallback;
  }

  return brandingName || tenantName || fallback;
};

export const resolveTenantDesignPreset = ({ tenant = {}, settings = {} } = {}) => {
  const rawPreset = resolveRawDesignPreset(settings);
  if (rawPreset) {
    return rawPreset;
  }

  return DEFAULT_NON_PIQUIM_DESIGN_PRESET;
};
