import express from 'express';
import { pool } from '../db.js';
import { resolveTenant } from '../middleware/tenant.js';
import {
  normalizeBranches,
  normalizeShippingZones,
  toNumber,
} from '../services/shipping.js';

export const settingsRouter = express.Router();
export const settingsAdminRouter = express.Router();

settingsRouter.use(resolveTenant);
settingsAdminRouter.use(resolveTenant);

const ALLOWED_MODES = new Set(['whatsapp', 'transfer', 'both']);
const ALLOWED_METHODS = new Set(['transfer', 'cash_on_pickup']);

function normalizePaymentMethod(value) {
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

function normalizeMethodsList(value) {
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

function deriveMethodsFromLegacyMode(commerce = {}) {
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

function toLegacyMode(methods = []) {
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

function normalizeCheckoutSettings(commerce = {}) {
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
    },
  };
}

function sanitizeCheckoutPayload(payload = {}) {
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
    ...(taxRate !== null ? { tax_rate: taxRate } : {}),
    ...(shippingFlat !== null ? { shipping_flat: shippingFlat } : {}),
    ...(shippingZones ? { shipping_zones: shippingZones } : {}),
    ...(branches ? { branches } : {}),
    ...(defaultDelivery !== null ? { default_delivery: defaultDelivery } : {}),
    ...(payload.bank_transfer
      ? {
          bank_transfer: {
            cbu: bankTransfer.cbu ? String(bankTransfer.cbu).trim() : '',
            alias: bankTransfer.alias ? String(bankTransfer.alias).trim() : '',
            bank: bankTransfer.bank ? String(bankTransfer.bank).trim() : '',
            holder: bankTransfer.holder ? String(bankTransfer.holder).trim() : '',
          },
        }
      : {}),
  };
}

settingsRouter.get('/checkout', async (req, res, next) => {
  try {
    const result = await pool.query(
      'select commerce from tenant_settings where tenant_id = $1',
      [req.tenant.id]
    );
    const commerce = (result.rows[0] && result.rows[0].commerce) || {};
    return res.json(normalizeCheckoutSettings(commerce));
  } catch (err) {
    return next(err);
  }
});

settingsAdminRouter.put('/checkout', async (req, res, next) => {
  try {
    const updates = sanitizeCheckoutPayload(req.body || {});
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'settings_required' });
    }

    const updateRes = await pool.query(
      [
        'update tenant_settings',
        'set commerce = commerce || $2::jsonb,',
        'updated_at = now()',
        'where tenant_id = $1',
        'returning commerce',
      ].join(' '),
      [req.tenant.id, updates]
    );

    if (!updateRes.rowCount) {
      return res.status(404).json({ error: 'tenant_settings_not_found' });
    }

    return res.json(normalizeCheckoutSettings(updateRes.rows[0].commerce));
  } catch (err) {
    return next(err);
  }
});
