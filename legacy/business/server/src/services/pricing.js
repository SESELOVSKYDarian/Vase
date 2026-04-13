export function normalizePriceAdjustments(commerce = {}) {
  const raw = commerce.price_adjustments || {};
  const retailPercent = Number(raw.retail_percent || 0);
  const wholesalePercent = Number(raw.wholesale_percent || 0);
  const userPercent = Number(raw.user_percent || 0);
  const promoEnabled = !!raw.promo_enabled;
  const promoPercent = Number(raw.promo_percent || 0);
  const promoScope = raw.promo_scope || 'both';

  return {
    retailPercent: Number.isFinite(retailPercent) ? retailPercent : 0,
    wholesalePercent: Number.isFinite(wholesalePercent) ? wholesalePercent : 0,
    userPercent: Number.isFinite(userPercent) ? userPercent : 0,
    promoEnabled,
    promoPercent: Number.isFinite(promoPercent) ? promoPercent : 0,
    promoScope,
    promoLabel: raw.promo_label || 'Oferta',
  };
}

export function applyPriceAdjustments(basePrice, segment, adjustments) {
  const safeBase = Number(basePrice || 0);
  if (!Number.isFinite(safeBase)) return 0;

  let price = safeBase;
  const percent =
    segment === 'wholesale' ? adjustments.wholesalePercent : adjustments.retailPercent;

  if (Number.isFinite(percent) && percent !== 0) {
    price = price * (1 + percent / 100);
  }

  if (Number.isFinite(adjustments.userPercent) && adjustments.userPercent !== 0) {
    price = price * (1 + adjustments.userPercent / 100);
  }

  if (
    adjustments.promoEnabled &&
    Number.isFinite(adjustments.promoPercent) &&
    adjustments.promoPercent !== 0
  ) {
    const scope = adjustments.promoScope || 'both';
    if (scope === 'both' || scope === segment) {
      price = price * (1 - adjustments.promoPercent / 100);
    }
  }

  const rounded = Math.round(price * 100) / 100;
  return Math.max(0, rounded);
}

export function resolveAdjustedPrices({
  priceRetail,
  priceWholesale,
  allowWholesale,
  adjustments,
}) {
  const retail = applyPriceAdjustments(priceRetail, 'retail', adjustments);
  const hasWholesale = priceWholesale != null && Number(priceWholesale) > 0;
  const wholesale = hasWholesale
    ? applyPriceAdjustments(priceWholesale, 'wholesale', adjustments)
    : null;
  const effective = allowWholesale && wholesale != null ? wholesale : retail;

  return {
    retail,
    wholesale,
    effective,
  };
}
