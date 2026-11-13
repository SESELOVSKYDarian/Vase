import { pool } from '../db.js';

// Mi negocio (app.vase.ar) es la fuente de los datos que se repiten entre productos: nombre, logo,
// contacto, redes, sucursales y razón social. Business los toma de ahí cuando están cargados;
// lo que Mi negocio deja vacío sigue saliendo de los ajustes propios de la tienda.

const CACHE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 3_000;
const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'youtube'];

const profileCache = new Map();
const tenantCache = new Map();

const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const normalizeName = (value) => String(value || '').trim().toLowerCase();

export function vaseAppBaseUrl() {
  return String(process.env.VASE_APP_INTERNAL_URL || process.env.VASE_APP_URL || 'http://vase-app:3001').replace(/\/+$/, '');
}

export function vaseProfileEditUrl() {
  const base = String(process.env.VASE_APP_URL || 'https://app.vase.ar').replace(/\/+$/, '');
  return `${base}/app/settings?tab=negocio`;
}

export function invalidateVaseBusinessProfile(globalTenantId) {
  profileCache.delete(String(globalTenantId || ''));
}

async function globalTenantIdFor(db, businessTenantId) {
  const cached = tenantCache.get(businessTenantId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const result = await db.query(
    "select external_tenant_id from tenants where id = $1 and external_source = 'vase' limit 1",
    [businessTenantId]
  );
  const value = text(result.rows[0]?.external_tenant_id);
  tenantCache.set(businessTenantId, { at: Date.now(), value });
  return value;
}

export async function fetchVaseBusinessProfile(globalTenantId, { fetchImpl = fetch } = {}) {
  const token = String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim();
  if (!token || !globalTenantId) return null;
  const cached = profileCache.get(globalTenantId);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  let value = null;
  try {
    const url = new URL('/api/internal/business/business-profile', vaseAppBaseUrl());
    url.searchParams.set('globalTenantId', globalTenantId);
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      const payload = await response.json();
      value = payload?.profile && typeof payload.profile === 'object' ? payload.profile : null;
    }
  } catch {
    // Si app.vase.ar no responde, la tienda sigue con sus propios datos.
    return cached?.value ?? null;
  }
  profileCache.set(globalTenantId, { at: Date.now(), value });
  return value;
}

/** Nunca falla: si no hay conexión con Mi negocio devuelve null y la tienda usa lo suyo. */
export async function vaseProfileForTenant(businessTenantId, db = pool) {
  try {
    const globalTenantId = await globalTenantIdFor(db, businessTenantId);
    return globalTenantId ? await fetchVaseBusinessProfile(globalTenantId) : null;
  } catch {
    return null;
  }
}

function mergeBranches(current, profileBranches) {
  const existing = Array.isArray(current) ? current : [];
  return profileBranches.map((branch) => {
    const previous = existing.find((item) => item?.vase_id === branch.id)
      || existing.find((item) => !item?.vase_id && normalizeName(item?.name) === normalizeName(branch.name));
    return {
      pickup_fee: 0,
      enabled: true,
      latitude: null,
      longitude: null,
      ...(previous || {}),
      id: previous?.id || `vase-${branch.id}`,
      vase_id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone || '',
      hours: branch.hours || '',
    };
  });
}

/** Pone los datos de Mi negocio sobre los ajustes de la tienda. No toca lo que Mi negocio deja vacío. */
export function applyVaseBusinessProfile(settings, profile) {
  if (!profile || typeof profile !== 'object') return settings;
  const branding = { ...asObject(settings?.branding) };
  const commerce = { ...asObject(settings?.commerce) };
  const footer = { ...asObject(branding.footer) };
  const contact = { ...asObject(footer.contact) };
  const socials = { ...asObject(footer.socials) };
  const branches = Array.isArray(profile.branches) ? profile.branches.filter((branch) => text(branch?.name) && text(branch?.address)) : [];
  const mainBranch = branches.find((branch) => branch.isMain) || branches[0] || null;

  if (text(profile.name)) branding.name = text(profile.name);
  if (text(profile.logoUrl)) branding.logo_url = text(profile.logoUrl);
  if (text(profile.tagline)) footer.description = text(profile.tagline);
  if (text(profile.phone)) {
    contact.phone = text(profile.phone);
    commerce.phone = text(profile.phone);
  }
  if (text(profile.email)) {
    contact.email = text(profile.email);
    commerce.email = text(profile.email);
  }
  if (text(mainBranch?.address)) {
    contact.address = text(mainBranch.address);
    commerce.address = text(mainBranch.address);
  }
  if (text(profile.whatsapp)) commerce.whatsapp_number = text(profile.whatsapp);
  for (const key of SOCIAL_KEYS) {
    const link = Array.isArray(profile.socialLinks) ? profile.socialLinks.find((item) => item?.network === key && text(item?.url)) : null;
    if (link) socials[key] = text(link.url);
  }
  if (branches.length) commerce.branches = mergeBranches(commerce.branches, branches);
  if (text(profile.fiscal?.legalName)) commerce.legal_company_name = text(profile.fiscal.legalName);

  footer.contact = contact;
  footer.socials = socials;
  branding.footer = footer;
  return { ...settings, branding, commerce };
}

/** Lo que la tienda ya tenía, para cargar Mi negocio la primera vez sin perder nada. */
export function seedFromBusinessSettings(settings) {
  const branding = asObject(settings?.branding);
  const commerce = asObject(settings?.commerce);
  const footer = asObject(branding.footer);
  const contact = asObject(footer.contact);
  const socials = asObject(footer.socials);
  return {
    name: text(branding.name),
    logoUrl: text(branding.logo_url),
    tagline: text(footer.description),
    phone: text(contact.phone) || text(commerce.phone),
    email: text(contact.email) || text(commerce.email),
    whatsapp: text(commerce.whatsapp_number),
    socialLinks: SOCIAL_KEYS.filter((key) => text(socials[key])).map((key) => ({ network: key, url: text(socials[key]) })),
    branches: (Array.isArray(commerce.branches) ? commerce.branches : [])
      .filter((branch) => text(branch?.name) && text(branch?.address))
      .map((branch) => ({ name: text(branch.name), address: text(branch.address), phone: text(branch.phone), hours: text(branch.hours) })),
    legalName: text(commerce.legal_company_name),
  };
}
