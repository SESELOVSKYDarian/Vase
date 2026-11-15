// Parte de public.js: mapProductRow, parseBooleanQuery, parseNumericQuery, slugifyPublicCategory, resolvePublicCategoryAliases, normalizeSortValue y más.
import { normalizeSpecSheet } from '../../services/specSheet.js';
import { applyPriceTierLabels } from '../../services/priceTierLabels.js';
import { resolveEffectiveProductPrice } from '../../services/userPricing.js';
import { applyOfferDiscount, resolveBestOfferForProduct } from '../../services/offers.js';
import { normalizeStoredPriceTiers } from './build-pricing-context.js';

export function mapProductRow(row, pricingContext) {
  const { adjustments, pricingProfile, priceTierLabels, offers, userId, specialPrices } = pricingContext;
  const priceRetail = Number(row.price || 0);
  const priceWholesale = Number(row.price_wholesale || 0);
  const { retail, wholesale, effective, segment, priceList, pendingWholesale } =
    resolveEffectiveProductPrice({
      priceRetail,
      priceWholesale,
      profile: pricingProfile,
      adjustments,
      specialPrice: specialPrices?.get(row.id) ?? null,
    });

  const bestOffer = resolveBestOfferForProduct({
    offers,
    userId,
    priceListId: pricingProfile?.priceList?.id || null,
    categoryIds: row.category_ids || [],
    productId: row.id,
    price: effective,
  });
  const finalPrice = applyOfferDiscount(effective, bestOffer.percent);
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const priceTiers = applyPriceTierLabels(
    normalizeStoredPriceTiers(data, priceRetail, priceWholesale),
    priceTierLabels
  );
  const fallbackDescription =
    data.long_description ||
    data.longDescription ||
    row.description ||
    row.name ||
    null;
  const specifications =
    data.specifications && typeof data.specifications === 'object' ? data.specifications : {};
  const rawVariationGroup = String(
    data.variant_group || data.variantGroup || ''
  ).trim();
  const rawVariationGroupLabel = String(
    data.variant_group_label || data.variantGroupLabel || ''
  ).trim();
  const rawVariationLabel = String(
    data.variant_label ||
      data.variantLabel ||
      data.variant ||
      specifications.color ||
      specifications.acabado ||
      specifications.terminacion ||
      specifications.modelo ||
      specifications.medida ||
      ''
  ).trim();
  const collectionGroup = String(data.collection || '').trim();
  const hasVariationSignal = Boolean(rawVariationGroup || rawVariationLabel);
  const variationGroup = rawVariationGroup || (hasVariationSignal ? collectionGroup : null);
  const isVariantRoot =
    data.is_variant_root === true ||
    data.isVariantRoot === true ||
    String(data.is_variant_root || data.isVariantRoot || '')
      .trim()
      .toLowerCase() === 'true';

  return {
    id: row.id,
    erp_id: row.erp_id,
    sku: row.sku,
    name: row.name,
    description: row.description || row.name || null,
    short_description:
      data.short_description ||
      data.shortDescription ||
      fallbackDescription,
    long_description:
      data.long_description ||
      data.longDescription ||
      fallbackDescription,
    show_specifications: data.show_specifications !== false,
    // Ficha técnica en PDF (se vuelve a validar por si quedó un link viejo).
    spec_sheet: normalizeSpecSheet(data.spec_sheet),
    price: finalPrice,
    price_retail: retail,
    price_wholesale: wholesale,
    price_tiers: priceTiers,
    currency: row.currency,
    stock: row.stock,
    brand: row.brand,
    category_ids: row.category_ids || [],
    category_names: row.category_names || [],
    category_paths: row.category_paths || [],
    data,
    source_category: data.source_category || null,
    source_category_path: Array.isArray(data.source_category_path) ? data.source_category_path : [],
    variation_group: variationGroup || null,
    variation_group_label: rawVariationGroupLabel || variationGroup || null,
    variation_label: rawVariationLabel || null,
    is_variant_root: isVariantRoot,
    pricing: {
      segment,
      pending_wholesale: pendingWholesale,
      price_list: priceList,
      offer: bestOffer.percent > 0
        ? {
            id: bestOffer.id,
            label: bestOffer.label,
            percent: Math.round(bestOffer.percent),
            kind: bestOffer.kind,
          }
        : null,
    },
  };
}

export function parseBooleanQuery(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function parseNumericQuery(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function slugifyPublicCategory(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolvePublicCategoryAliases(value) {
  const normalized = slugifyPublicCategory(value);
  if (normalized === 'panaderia' || normalized === 'confiteria' || normalized === 'panaderia-confiteria') {
    return ['panaderia', 'confiteria', 'panaderia-confiteria'];
  }
  return normalized ? [normalized] : [];
}

export function normalizeSortValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (
    [
      'name-desc',
      'price-asc',
      'price-desc',
      'stock-asc',
      'stock-desc',
    ].includes(normalized)
  ) {
    return normalized;
  }
  return 'name-asc';
}

export function getComparablePrice(item) {
  if (item?.price_range && Number.isFinite(Number(item.price_range.min))) {
    return Number(item.price_range.min);
  }
  return Number(item?.price || 0);
}

export function getComparableStock(item) {
  return Number(item?.stock || 0);
}

export function getVariationDisplayLabel(item) {
  return String(item?.variation_label || item?.sku || item?.name || '')
    .trim()
    .toLowerCase();
}

export function sortPublicProducts(items, sort) {
  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  const next = [...items];
  next.sort((a, b) => {
    if (sort === 'name-desc') {
      return collator.compare(String(b?.name || ''), String(a?.name || ''));
    }
    if (sort === 'price-asc') {
      return getComparablePrice(a) - getComparablePrice(b);
    }
    if (sort === 'price-desc') {
      return getComparablePrice(b) - getComparablePrice(a);
    }
    if (sort === 'stock-asc') {
      return getComparableStock(a) - getComparableStock(b);
    }
    if (sort === 'stock-desc') {
      return getComparableStock(b) - getComparableStock(a);
    }
    return collator.compare(String(a?.name || ''), String(b?.name || ''));
  });
  return next;
}
