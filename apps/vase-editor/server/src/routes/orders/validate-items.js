// Revisa los productos del pedido contra el catálogo y calcula los precios reales.
import { pool } from '../../db.js';
import { resolveEffectiveProductPrice } from '../../services/userPricing.js';
import { applyOfferDiscount, resolveBestOfferForProduct } from '../../services/offers.js';
import { normalizeItems } from './checkout-options.js';

export async function validateItems(tenantId, items, adjustments, context = {}) {
  const { pricingProfile, offers = [], userId = null, specialPrices = null } = context;
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
