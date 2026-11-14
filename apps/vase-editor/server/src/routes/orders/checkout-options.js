// Formas de pago y canales de pedido que acepta cada tienda.

export const ALLOWED_METHODS = new Set(['transfer', 'cash_on_pickup']);
export const ALLOWED_ORDER_CHANNELS = new Set(['whatsapp', 'email']);
export const ALLOWED_STATUSES = new Set([
  'submitted',
  'pending_payment',
  'paid',
  'processing',
  'unpaid',
  'cancelled',
  'draft',
]);

export function normalizePaymentMethod(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw === 'cash' || raw === 'pickup' || raw === 'local' || raw === 'store') {
    return 'cash_on_pickup';
  }
  if (raw === 'whatsapp') {
    return 'transfer';
  }
  return ALLOWED_METHODS.has(raw) ? raw : null;
}

export function normalizeOrderChannel(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'gmail' || raw === 'mail' || raw === 'correo') {
    return 'email';
  }
  if (raw === 'wa') {
    return 'whatsapp';
  }
  return ALLOWED_ORDER_CHANNELS.has(raw) ? raw : null;
}

export function parseBooleanInput(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function getEnabledMethods(settings = {}) {
  if (Array.isArray(settings.payment_methods)) {
    const methods = settings.payment_methods
      .map((entry) => normalizePaymentMethod(entry))
      .filter(Boolean);
    if (methods.length) {
      return [...new Set(methods)];
    }
  }

  const rawMode = settings.checkout_mode || settings.mode || 'both';
  const normalizedMode = String(rawMode).toLowerCase();
  if (normalizedMode === 'hybrid' || normalizedMode === 'both') {
    return ['transfer', 'cash_on_pickup'];
  }
  if (normalizedMode === 'transfer') {
    return ['transfer'];
  }
  if (normalizedMode === 'cash_on_pickup') {
    return ['cash_on_pickup'];
  }
  return ['transfer'];
}

export function resolveCheckoutMethod(settings = {}, requested = '') {
  const enabledMethods = getEnabledMethods(settings);
  const normalizedRequested = normalizePaymentMethod(requested);
  if (normalizedRequested && enabledMethods.includes(normalizedRequested)) {
    return normalizedRequested;
  }
  return enabledMethods[0] || 'transfer';
}

export function resolveOrderChannel(settings = {}, requested = '') {
  const normalizedRequested = normalizeOrderChannel(requested);
  if (normalizedRequested) {
    return normalizedRequested;
  }
  const hasWhatsapp = String(settings?.whatsapp_number || '').replace(/\D/g, '');
  return hasWhatsapp ? 'whatsapp' : 'email';
}

export function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.product_id)
    .map((item) => ({
      product_id: item.product_id,
      qty: Math.max(1, Number(item.qty || 1)),
    }));
}
