// Parte de checkout.js: checkoutRouter, ALLOWED_METHODS, UUID_REGEX, normalizePaymentMethod, getEnabledMethods, resolveCheckoutMethod y más.
import express from 'express';
import { pool } from '../../db.js';
import { normalizePriceAdjustments } from '../../services/pricing.js';
import { resolveEffectiveProductPrice, resolvePricingProfile } from '../../services/userPricing.js';
import { loadSpecialPrices } from '../../services/specialPrices.js';
import { applyOfferDiscount, getTenantOffers, resolveBestOfferForProduct } from '../../services/offers.js';

export const checkoutRouter = express.Router();


export const ALLOWED_METHODS = new Set(['transfer', 'cash_on_pickup']);
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export function getEnabledMethods(commerce = {}) {
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

export function resolveCheckoutMethod(commerce = {}, requested = '') {
  const methods = getEnabledMethods(commerce);
  const normalizedRequested = normalizePaymentMethod(requested);
  if (normalizedRequested && methods.includes(normalizedRequested)) {
    return normalizedRequested;
  }
  return methods[0] || 'transfer';
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

export async function validateItems(tenantId, items, adjustments, context = {}) {
  const { pricingProfile, offers = [], userId = null, specialPrices = null } = context;
  const normalized = normalizeItems(items);
  const ids = normalized.map((item) => item.product_id);
  const invalidIds = ids.filter((id) => !UUID_REGEX.test(String(id || '')));

  if (!ids.length) {
    return { valid: false, errors: ['empty_items'] };
  }
  if (invalidIds.length) {
    return { valid: false, errors: invalidIds.map((id) => `invalid_product_id:${id}`), items: [] };
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
        specialPrice: specialPrices?.get(product.id) ?? null,
      });
      const bestOffer = resolveBestOfferForProduct({
        offers,
        userId,
        priceListId: pricingProfile?.priceList?.id || null,
        categoryIds: product.category_ids || [],
        productId: product.id,
        price: effective,
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
        category_ids: product.category_ids || [],
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

export async function buildCheckoutContext(req) {
  const settingsRes = await pool.query(
    'select commerce from tenant_settings where tenant_id = $1',
    [req.tenant.id]
  );
  const commerce = (settingsRes.rows[0] && settingsRes.rows[0].commerce) || {};
  const adjustments = normalizePriceAdjustments(commerce);
  const pricingProfile = await resolvePricingProfile({
    tenantId: req.tenant.id,
    user: req.user || null,

    commerce,
  });
  const specialPrices = await loadSpecialPrices({
    tenantId: req.tenant.id,
    userId: req.user?.id || null,
    priceListId: pricingProfile?.priceList?.id || null,
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
    specialPrices,
  };
}
