import express from 'express';
import { resolveTenant } from '../middleware/tenant.js';
import { pool } from '../db.js';
import { normalizePriceAdjustments } from '../services/pricing.js';
import { resolveEffectiveProductPrice, resolvePricingProfile } from '../services/userPricing.js';
import {
  resolveShippingAmount,
  toNumber,
} from '../services/shipping.js';
import {
  applyOfferDiscount,
  getTenantOffers,
  resolveBestOfferForProduct,
} from '../services/offers.js';

export const checkoutRouter = express.Router();

checkoutRouter.use(resolveTenant);

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
  return ALLOWED_METHODS.has(raw) ? raw : null;
}

function getEnabledMethods(commerce = {}) {
  if (Array.isArray(commerce.payment_methods)) {
    const methods = commerce.payment_methods
      .map((entry) => normalizePaymentMethod(entry))
      .filter(Boolean);
    if (methods.length) {
      return [...new Set(methods)];
    }
  }

  const mode = String(commerce.checkout_mode || commerce.mode || 'both').toLowerCase();
  if (mode === 'hybrid' || mode === 'both') {
    return ['transfer', 'cash_on_pickup'];
  }
  if (mode === 'transfer') {
    return ['transfer'];
  }
  if (mode === 'cash_on_pickup') {
    return ['cash_on_pickup'];
  }
  return ['transfer'];
}

function resolveCheckoutMethod(commerce = {}, requested = '') {
  const methods = getEnabledMethods(commerce);
  const normalizedRequested = normalizePaymentMethod(requested);
  if (normalizedRequested && methods.includes(normalizedRequested)) {
    return normalizedRequested;
  }
  return methods[0] || 'transfer';
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.product_id)
    .map((item) => ({
      product_id: item.product_id,
      qty: Math.max(1, Number(item.qty || 1)),
    }));
}

async function validateItems(tenantId, items, adjustments, context = {}) {
  const { pricingProfile, offers = [], userId = null } = context;
  const normalized = normalizeItems(items);
  const ids = normalized.map((item) => item.product_id);

  if (!ids.length) {
    return { valid: false, errors: ['empty_items'] };
  }

  const result = await pool.query(
    [
      'select p.id, p.sku, p.name, p.price, p.price_wholesale, p.currency, p.stock,',
      "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids",
      'from product_cache p',
      'where p.tenant_id = $1 and p.id = ANY($2::uuid[])',
    ].join(' '),
    [tenantId, ids]
  );

  const products = result.rows;
  const errors = [];
  let currency = null;
  let subtotal = 0;

  const lineItems = normalized
    .map((item) => {
      const product = products.find((row) => row.id === item.product_id);
      if (!product) {
        errors.push(`product_not_found:${item.product_id}`);
        return null;
      }

      if (product.stock < item.qty) {
        errors.push(`insufficient_stock:${product.id}`);
      }

      currency = currency || product.currency;
      const { effective } = resolveEffectiveProductPrice({
        priceRetail: product.price,
        priceWholesale: product.price_wholesale,
        profile: pricingProfile,
        adjustments,
      });
      const bestOffer = resolveBestOfferForProduct({
        offers,
        userId,
        categoryIds: product.category_ids || [],
      });
      const unitPrice = Number(applyOfferDiscount(effective, bestOffer.percent) || 0);
      subtotal += unitPrice * item.qty;

      return {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        qty: item.qty,
        unit_price: unitPrice,
        total: unitPrice * item.qty,
        currency: product.currency,
      };
    })
    .filter(Boolean);

  return {
    valid: errors.length === 0,
    currency: currency || 'ARS',
    subtotal,
    items: lineItems,
    errors,
  };
}

async function buildCheckoutContext(req) {
  const settingsRes = await pool.query(
    'select commerce from tenant_settings where tenant_id = $1',
    [req.tenant.id]
  );
  const commerce = (settingsRes.rows[0] && settingsRes.rows[0].commerce) || {};
  const adjustments = normalizePriceAdjustments(commerce);
  const pricingProfile = await resolvePricingProfile({
    tenantId: req.tenant.id,
    user: req.user || null,
  });

  let offers = [];
  try {
    offers = await getTenantOffers(req.tenant.id, { onlyEnabled: true });
  } catch (err) {
    console.warn('Failed to load tenant offers for checkout:', err?.message || err);
  }

  return {
    commerce,
    adjustments,
    pricingProfile,
    offers,
    userId: req.user?.id || null,
  };
}

checkoutRouter.post('/validate', async (req, res, next) => {
  try {
    const context = await buildCheckoutContext(req);
    const result = await validateItems(req.tenant.id, req.body.items, context.adjustments, context);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

checkoutRouter.post('/create', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const context = await buildCheckoutContext(req);
    const { commerce, adjustments } = context;
    const validation = await validateItems(req.tenant.id, req.body.items, adjustments, context);
    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    const requestedPayment = req.body?.customer?.payment_method || req.body?.payment_method || null;
    const checkoutMode = resolveCheckoutMethod(commerce, requestedPayment);
    const customer = req.body.customer || {};
    const shippingInfo = resolveShippingAmount(commerce, customer);
    const taxRate = Number(commerce.tax_rate || 0);
    if (shippingInfo?.error) {
      return res.status(400).json({ error: shippingInfo.error });
    }

    const shipping = toNumber(shippingInfo.amount, 0);
    const tax = (validation.subtotal + shipping) * taxRate;
    const total = validation.subtotal + shipping + tax;

    await client.query('BEGIN');
    for (const item of validation.items) {
      const stockRes = await client.query(
        [
          'update product_cache',
          'set stock = case when stock is null then null else stock - $1 end, updated_at = now()',
          'where tenant_id = $2 and id = $3 and (stock is null or stock >= $1)',
          'returning stock',
        ].join(' '),
        [item.qty, req.tenant.id, item.product_id]
      );
      if (!stockRes.rowCount) {
        throw new Error(`insufficient_stock:${item.product_id}`);
      }
    }

    const orderStatus = checkoutMode === 'transfer' ? 'pending_payment' : 'submitted';
    const customerPayload = {
      ...customer,
      payment_method: checkoutMode,
      shipping_zone_id: shippingInfo.shipping_zone_id,
      branch_id: shippingInfo.branch_id,
      shipping_distance_km: shippingInfo.distance_km ?? null,
      shipping_zone_type: shippingInfo.shipping_zone_type || null,
    };

    const orderRes = await client.query(
      [
        'insert into orders (tenant_id, user_id, status, checkout_mode, currency, subtotal, tax, shipping, total, customer)',
        'values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb) returning id',
      ].join(' '),
      [
        req.tenant.id,
        req.user?.id || null,
        orderStatus,
        checkoutMode,
        validation.currency,
        validation.subtotal,
        tax,
        shipping,
        total,
        customerPayload,
      ]
    );

    const orderId = orderRes.rows[0].id;

    for (const item of validation.items) {
      await client.query(
        [
          'insert into order_items (order_id, product_id, sku, name, qty, unit_price, total)',
          'values ($1, $2, $3, $4, $5, $6, $7)',
        ].join(' '),
        [orderId, item.product_id, item.sku, item.name, item.qty, item.unit_price, item.total]
      );
    }

    let payment = null;
    const whatsapp_url = null;

    const provider =
      checkoutMode === 'transfer'
        ? 'bank_transfer'
        : checkoutMode === 'cash_on_pickup'
          ? 'cash_on_pickup'
          : 'manual';
    payment = {
      provider,
      status: orderStatus === 'pending_payment' ? 'pending' : 'submitted',
    };

    await client.query(
      [
        'insert into payments (tenant_id, order_id, provider, status, amount, currency, metadata)',
        'values ($1, $2, $3, $4, $5, $6, $7::jsonb)',
      ].join(' '),
      [
        req.tenant.id,
        orderId,
        provider,
        payment.status,
        total,
        validation.currency,
        { checkout_mode: checkoutMode },
      ]
    );

    await client.query('COMMIT');
    return res.json({ order_id: orderId, checkout_mode: checkoutMode, payment, whatsapp_url });
  } catch (err) {
    await client.query('ROLLBACK');
    if (String(err?.message || '').startsWith('insufficient_stock:')) {
      return res.status(400).json({ valid: false, errors: [err.message] });
    }
    return next(err);
  } finally {
    client.release();
  }
});
