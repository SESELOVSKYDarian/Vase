// Parte de settings.js: settingsRouter, settingsAdminRouter, ALLOWED_MODES, ALLOWED_METHODS, EMAIL_RE, emailSettings y más.
import express from 'express';
import { normalizeBranches, normalizeShippingZones, toNumber } from '../../services/shipping.js';

export const settingsRouter = express.Router();
export const settingsAdminRouter = express.Router();


export const ALLOWED_MODES = new Set(['whatsapp', 'transfer', 'both']);
export const ALLOWED_METHODS = new Set(['transfer', 'cash_on_pickup']);
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailSettings(commerce = {}) {
  return {
    smtp_from_name: String(commerce.smtp_from_name || ''), email: String(commerce.email || ''),
    order_notification_email: String(commerce.order_notification_email || commerce.email || ''),
    smtp_host: String(commerce.smtp_host || ''), smtp_port: Number(commerce.smtp_port || 465),
    smtp_secure: commerce.smtp_secure !== false, smtp_user: String(commerce.smtp_user || ''),
    smtp_from: String(commerce.smtp_from || ''), has_smtp_password: Boolean(String(commerce.smtp_password || '').trim()),
    has_legacy_gmail: Boolean(String(commerce.gmail_sender_email || '').trim() && String(commerce.gmail_app_password || '').trim()),
  };
}

export function emailUpdates(payload = {}, current = {}) {
  const fields = ['smtp_from_name', 'email', 'order_notification_email', 'smtp_host', 'smtp_user', 'smtp_from'];
  const updates = Object.fromEntries(fields.filter((key) => payload[key] !== undefined).map((key) => [key, String(payload[key] || '').trim()]));
  if (payload.smtp_port !== undefined) updates.smtp_port = Number(payload.smtp_port);
  if (payload.smtp_secure !== undefined) updates.smtp_secure = payload.smtp_secure === true || String(payload.smtp_secure).toLowerCase() === 'true';
  if (String(payload.smtp_password || '').trim()) updates.smtp_password = String(payload.smtp_password).trim();
  const candidate = { ...current, ...updates };
  if (!candidate.smtp_host || !candidate.smtp_user || !String(candidate.smtp_password || '').trim() || !EMAIL_RE.test(candidate.smtp_from || candidate.smtp_user) || !Number.isInteger(candidate.smtp_port) || candidate.smtp_port < 1 || candidate.smtp_port > 65535) return null;
  return updates;
}

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
  if (!ALLOWED_METHODS.has(raw)) {
    return null;
  }
  return raw;
}

export function normalizeMethodsList(value) {
  const list = Array.isArray(value) ? value : [];
  const unique = [];
  list.forEach((item) => {
    const normalized = normalizePaymentMethod(item);
    if (!normalized) return;
    if (!unique.includes(normalized)) {
      unique.push(normalized);
    }
  });
  return unique;
}

export function deriveMethodsFromLegacyMode(commerce = {}) {
  const paymentMethods = normalizeMethodsList(commerce.payment_methods);
  if (paymentMethods.length) {
    return paymentMethods;
  }

  const fallbackMode = commerce.checkout_mode || commerce.mode || 'both';
  if (fallbackMode === 'both' || fallbackMode === 'hybrid') {
    return ['transfer', 'cash_on_pickup'];
  }
  if (fallbackMode === 'transfer') {
    return ['transfer'];
  }
  if (fallbackMode === 'cash_on_pickup') {
    return ['cash_on_pickup'];
  }
  return ['transfer'];
}

export function toLegacyMode(methods = []) {
  if (methods.length === 1 && methods[0] === 'transfer') {
    return 'transfer';
  }
  if (methods.includes('transfer') && methods.includes('cash_on_pickup') && methods.length <= 2) {
    return 'both';
  }
  if (methods.includes('transfer')) {
    return 'transfer';
  }
  return 'both';
}

export function normalizeCheckoutSettings(commerce = {}) {
  const methods = deriveMethodsFromLegacyMode(commerce);
  const mode = toLegacyMode(methods);

  const bankTransfer = commerce.bank_transfer || {};
  const branches = normalizeBranches(commerce.branches).filter((entry) => entry.name);
  let shippingZones = normalizeShippingZones(commerce.shipping_zones).filter((entry) => entry.name);
  if (!shippingZones.length) {
    shippingZones = [
      {
        id: 'arg-general',
        name: 'Argentina',
        description: 'Cobertura nacional',
        price: toNumber(commerce.shipping_flat, 0),
        enabled: true,
        type: 'flat',
        branch_id: null,
        min_distance_km: 0,
        max_distance_km: null,
      },
    ];
  }
  const defaultDelivery =
    String(commerce.default_delivery || '').trim() ||
    (shippingZones.length ? `zone:${shippingZones[0].id}` : branches.length ? `branch:${branches[0].id}` : '');

  return {
    mode,
    enabled_methods: methods,
    whatsapp_number: commerce.whatsapp_number || '',
    whatsapp_template: commerce.whatsapp_template || '',
    order_channels: Array.isArray(commerce.order_channels) && commerce.order_channels.length ? commerce.order_channels : ['whatsapp', 'email'],
    order_notification_email: commerce.order_notification_email || commerce.email || '',
    admin_order_confirmation_label: commerce.admin_order_confirmation_label || 'En confirmacion',
    customer_order_processing_label: commerce.customer_order_processing_label || 'En proceso',
    admin_order_confirmation_text:
      commerce.admin_order_confirmation_text ||
      'Tienes un pedido en confirmacion. Revisa el panel de usuarios y confirma la compra.',
    customer_order_processing_text:
      commerce.customer_order_processing_text ||
      'Tu pedido fue recibido y se encuentra en proceso.',
    shipping_flat: toNumber(commerce.shipping_flat, 0),
    tax_rate: toNumber(commerce.tax_rate, 0),
    default_delivery: defaultDelivery,
    shipping_zones: shippingZones,
    branches,
    bank_transfer: {
      cbu: bankTransfer.cbu || '',
      alias: bankTransfer.alias || '',
      bank: bankTransfer.bank || '',
      holder: bankTransfer.holder || '',
      highlight: ['alias', 'cbu'].includes(bankTransfer.highlight) ? bankTransfer.highlight : '',
    },
    gmail_sender_email: commerce.gmail_sender_email || '',
    has_gmail_app_password: Boolean(String(commerce.gmail_app_password || '').trim()),
  };
}

export function sanitizeCheckoutPayload(payload = {}) {
  const mode = ALLOWED_MODES.has(payload.mode) ? payload.mode : null;
  const whatsappNumber = payload.whatsapp_number != null ? String(payload.whatsapp_number).trim() : null;
  const whatsappTemplate = payload.whatsapp_template != null ? String(payload.whatsapp_template).trim() : null;
  const orderNotificationEmail =
    payload.order_notification_email != null ? String(payload.order_notification_email).trim() : null;
  const adminOrderConfirmationLabel =
    payload.admin_order_confirmation_label != null ? String(payload.admin_order_confirmation_label).trim() : null;
  const customerOrderProcessingLabel =
    payload.customer_order_processing_label != null ? String(payload.customer_order_processing_label).trim() : null;
  const adminOrderConfirmationText =
    payload.admin_order_confirmation_text != null ? String(payload.admin_order_confirmation_text).trim() : null;
  const customerOrderProcessingText =
    payload.customer_order_processing_text != null ? String(payload.customer_order_processing_text).trim() : null;
  const bankTransfer = payload.bank_transfer || {};
  const shippingZones = Array.isArray(payload.shipping_zones)
    ? normalizeShippingZones(payload.shipping_zones).filter((entry) => entry.name)
    : null;
  const branches = Array.isArray(payload.branches)
    ? normalizeBranches(payload.branches).filter((entry) => entry.name)
    : null;
  const methods = Array.isArray(payload.enabled_methods)
    ? normalizeMethodsList(payload.enabled_methods)
    : null;
  const taxRate =
    payload.tax_rate !== undefined && payload.tax_rate !== null ? toNumber(payload.tax_rate, 0) : null;
  const shippingFlat =
    payload.shipping_flat !== undefined && payload.shipping_flat !== null
      ? toNumber(payload.shipping_flat, 0)
      : null;
  const defaultDelivery =
    payload.default_delivery !== undefined && payload.default_delivery !== null
      ? String(payload.default_delivery).trim()
      : null;
  const gmailSenderEmail =
    payload.gmail_sender_email !== undefined && payload.gmail_sender_email !== null
      ? String(payload.gmail_sender_email).trim()
      : null;
  const gmailAppPassword =
    payload.gmail_app_password !== undefined && payload.gmail_app_password !== null
      ? String(payload.gmail_app_password).trim()
      : null;

  // Panel nuevo: por dónde se manda el pedido y textos de los avisos de pago.
  const orderChannels = Array.isArray(payload.order_channels)
    ? [...new Set(payload.order_channels.map((item) => String(item || '').trim().toLowerCase()))].filter((item) => ['whatsapp', 'email'].includes(item))
    : null;
  const paymentTexts = {};
  for (const key of ['customer_payment_approved_subject', 'customer_payment_approved_text', 'customer_payment_cancelled_subject', 'customer_payment_cancelled_text']) {
    if (payload[key] !== undefined && payload[key] !== null) paymentTexts[key] = String(payload[key]).trim();
  }

  const normalizedMode = methods?.length ? toLegacyMode(methods) : mode;

  return {
    ...(normalizedMode ? { checkout_mode: normalizedMode } : {}),
    ...(whatsappNumber !== null ? { whatsapp_number: whatsappNumber } : {}),
    ...(whatsappTemplate !== null ? { whatsapp_template: whatsappTemplate } : {}),
    ...(orderNotificationEmail !== null ? { order_notification_email: orderNotificationEmail } : {}),
    ...(adminOrderConfirmationLabel !== null ? { admin_order_confirmation_label: adminOrderConfirmationLabel } : {}),
    ...(customerOrderProcessingLabel !== null ? { customer_order_processing_label: customerOrderProcessingLabel } : {}),
    ...(adminOrderConfirmationText !== null ? { admin_order_confirmation_text: adminOrderConfirmationText } : {}),
    ...(customerOrderProcessingText !== null ? { customer_order_processing_text: customerOrderProcessingText } : {}),
    ...(methods ? { payment_methods: methods } : {}),
    ...(orderChannels?.length ? { order_channels: orderChannels } : {}),
    ...paymentTexts,
    ...(taxRate !== null ? { tax_rate: taxRate } : {}),
    ...(shippingFlat !== null ? { shipping_flat: shippingFlat } : {}),
    ...(shippingZones ? { shipping_zones: shippingZones } : {}),
    ...(branches ? { branches } : {}),
    ...(defaultDelivery !== null ? { default_delivery: defaultDelivery } : {}),
    ...(gmailSenderEmail !== null ? { gmail_sender_email: gmailSenderEmail } : {}),
    ...(gmailAppPassword !== null ? { gmail_app_password: gmailAppPassword } : {}),
    ...(payload.bank_transfer
      ? {
          bank_transfer: {
            cbu: bankTransfer.cbu ? String(bankTransfer.cbu).trim() : '',
            alias: bankTransfer.alias ? String(bankTransfer.alias).trim() : '',
            bank: bankTransfer.bank ? String(bankTransfer.bank).trim() : '',
            holder: bankTransfer.holder ? String(bankTransfer.holder).trim() : '',
            highlight: ['alias', 'cbu'].includes(bankTransfer.highlight) ? bankTransfer.highlight : '',
          },
        }
      : {}),
  };
}


export const UUID_REGEX_SETTINGS = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
