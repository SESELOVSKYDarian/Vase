// Utilidades que usan varias rutas de la cuenta: validar ids, limpiar textos y leer valores del pedido.
import { normalizePriceTierLabels } from '../../services/priceTierLabels.js';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getTenantId(req, res) {
  const headerTenant = req.get('x-tenant-id');
  const tenantId = (req.user && req.user.tenantId) || headerTenant || null;
  if (!tenantId) {
    res.status(400).json({ error: 'tenant_required' });
    return null;
  }
  if (!UUID_REGEX.test(tenantId)) {
    res.status(400).json({ error: 'invalid_tenant_id' });
    return null;
  }
  return tenantId;
}

export function isUuid(value) {
  return UUID_REGEX.test(String(value || ''));
}

export function slugify(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeBrandName(value) {
  return String(value || '').trim();
}


export function parseUuidArray(value) {
  const list = Array.isArray(value) ? value : [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const unique = new Set();
  for (const item of list) {
    const raw = String(item || '').trim();
    if (!raw) continue;
    if (!uuidRegex.test(raw)) {
      return { ok: false, items: [] };
    }
    unique.add(raw);
  }
  return { ok: true, items: [...unique] };
}

export function parseBooleanInput(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function normalizeTenantSettingsPayload(row = {}) {
  const settings = row && typeof row === 'object' ? row : {};
  const commerce = settings.commerce && typeof settings.commerce === 'object' ? settings.commerce : {};

  return {
    ...settings,
    branding: settings.branding || {},
    theme: settings.theme || {},
    seo: settings.seo || {},
    commerce: {
      ...commerce,
      price_tier_labels: normalizePriceTierLabels(commerce.price_tier_labels),
    },
  };
}
