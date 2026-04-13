import { pool } from '../db.js';

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isOfferMatchUser(offer, userId) {
  const targets = asArray(offer.user_ids);
  if (!targets.length) return true;
  if (!userId) return false;
  return targets.includes(userId);
}

function isOfferMatchCategory(offer, categoryIds) {
  const targets = asArray(offer.category_ids);
  if (!targets.length) return true;
  const productCategoryIds = asArray(categoryIds);
  if (!productCategoryIds.length) return false;
  return targets.some((id) => productCategoryIds.includes(id));
}

export function applyOfferDiscount(price, percent) {
  const safePrice = Number(price || 0);
  const safePercent = Number(percent || 0);
  if (!Number.isFinite(safePrice) || !Number.isFinite(safePercent) || safePercent <= 0) {
    return Math.max(0, Number.isFinite(safePrice) ? safePrice : 0);
  }
  const discounted = safePrice * (1 - safePercent / 100);
  return Math.max(0, Math.round(discounted * 100) / 100);
}

export function resolveBestOfferForProduct({ offers, userId, categoryIds }) {
  const active = asArray(offers).filter((offer) => {
    if (!offer || !offer.enabled) return false;
    if (!isOfferMatchUser(offer, userId)) return false;
    if (!isOfferMatchCategory(offer, categoryIds)) return false;
    return Number(offer.percent || 0) > 0;
  });

  if (!active.length) {
    return { percent: 0, label: null, id: null };
  }

  let best = active[0];
  for (const offer of active) {
    if (Number(offer.percent || 0) > Number(best.percent || 0)) {
      best = offer;
    }
  }

  return {
    id: best.id,
    percent: Number(best.percent || 0),
    label: best.label || best.name || 'Oferta',
  };
}

export async function getTenantOffers(tenantId, { onlyEnabled = false } = {}) {
  if (!tenantId) return [];

  const params = [tenantId];
  let where = 'tenant_id = $1';
  if (onlyEnabled) {
    where += ' and enabled = true';
  }

  const result = await pool.query(
    [
      'select id, tenant_id, name, label, percent, enabled, user_ids, category_ids, created_at, updated_at',
      'from tenant_offers',
      `where ${where}`,
      'order by created_at desc',
    ].join(' '),
    params
  );

  return result.rows;
}
