import { pool } from '../db.js';

// Tipos de oferta. Las "clásicas" (porcentaje, sin productos ni fechas) guardan el porcentaje en
// `percent` como siempre. Las demás guardan percent = 0 y usan kind/value, así una versión anterior
// del sistema las ignora en lugar de aplicarlas mal.
export const OFFER_KINDS = ['percent', 'amount', 'fixed'];

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

// Una oferta puede ser para clientes puntuales (user_ids), para los de una lista de precios
// (price_list_ids) o para todos (las dos vacías).
function isOfferMatchUser(offer, userId, priceListId = null) {
  const users = asArray(offer.user_ids);
  const lists = asArray(offer.price_list_ids);
  if (!users.length && !lists.length) return true;
  if (userId && users.includes(userId)) return true;
  if (priceListId && lists.includes(priceListId)) return true;
  return false;
}

function isOfferMatchCategory(offer, categoryIds) {
  const targets = asArray(offer.category_ids);
  if (!targets.length) return true;
  const productCategoryIds = asArray(categoryIds);
  if (!productCategoryIds.length) return false;
  return targets.some((id) => productCategoryIds.includes(id));
}

function isOfferMatchProduct(offer, productId) {
  const targets = asArray(offer.product_ids);
  if (!targets.length) return true;
  if (!productId) return false;
  return targets.includes(productId);
}

function isOfferInDates(offer, now) {
  const time = now instanceof Date ? now.getTime() : Date.now();
  if (offer.starts_at && time < new Date(offer.starts_at).getTime()) return false;
  if (offer.ends_at && time > new Date(offer.ends_at).getTime()) return false;
  return true;
}

export function offerKind(offer) {
  return OFFER_KINDS.includes(offer?.kind) ? offer.kind : 'percent';
}

// Valor de la oferta: para las clásicas es el porcentaje de siempre.
export function offerValue(offer) {
  const kind = offerKind(offer);
  const value = Number(offer?.value || 0);
  if (kind === 'percent' && !(value > 0)) return Number(offer?.percent || 0);
  return value;
}

// Las clásicas son las únicas que entiende una versión anterior del sistema.
export function isClassicOffer({ kind, product_ids, price_list_ids, starts_at, ends_at }) {
  return (kind || 'percent') === 'percent' && !asArray(product_ids).length && !asArray(price_list_ids).length && !starts_at && !ends_at;
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

// Precio final de una oferta sobre un precio dado (null si no baja el precio).
export function offerFinalPrice(offer, price) {
  const base = Number(price || 0);
  const value = offerValue(offer);
  if (!(base > 0) || !(value > 0)) return null;
  const kind = offerKind(offer);
  let final;
  if (kind === 'amount') final = Math.max(0, base - value);
  else if (kind === 'fixed') final = value;
  else final = base * (1 - Math.min(value, 100) / 100);
  final = Math.round(final * 100) / 100;
  return final < base ? final : null;
}

// Si hay varias ofertas, gana la que deja el precio más bajo para el cliente.
// `percent` es el descuento efectivo, así quien llama sigue usando applyOfferDiscount(price, percent).
export function resolveBestOfferForProduct({ offers, userId, priceListId = null, categoryIds, productId = null, price = null, now = new Date() }) {
  const active = asArray(offers).filter((offer) => {
    if (!offer || !offer.enabled) return false;
    if (!isOfferMatchUser(offer, userId, priceListId)) return false;
    if (!isOfferMatchCategory(offer, categoryIds)) return false;
    if (!isOfferMatchProduct(offer, productId)) return false;
    if (!isOfferInDates(offer, now)) return false;
    return offerValue(offer) > 0;
  });

  const base = Number(price || 0);
  let best = null;
  let bestPercent = 0;
  for (const offer of active) {
    let percent;
    if (base > 0) {
      const final = offerFinalPrice(offer, base);
      if (final === null) continue;
      percent = (1 - final / base) * 100;
    } else {
      // Sin precio solo se pueden comparar las de porcentaje.
      if (offerKind(offer) !== 'percent') continue;
      percent = Math.min(offerValue(offer), 100);
    }
    if (percent > bestPercent) {
      best = offer;
      bestPercent = percent;
    }
  }

  if (!best) {
    return { percent: 0, label: null, id: null };
  }

  return {
    id: best.id,
    percent: bestPercent,
    label: best.label || best.name || 'Oferta',
    kind: offerKind(best),
    value: offerValue(best),
  };
}

// Columnas del panel nuevo. También corre al arrancar (index.js); acá por si se usa sin ese arranque.
let offerColumnsReady = null;
export function ensureOfferColumns() {
  if (!offerColumnsReady) {
    offerColumnsReady = pool.query(
      [
        'ALTER TABLE tenant_offers',
        "ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'percent',",
        'ADD COLUMN IF NOT EXISTS value numeric(14,2) NOT NULL DEFAULT 0,',
        "ADD COLUMN IF NOT EXISTS product_ids uuid[] NOT NULL DEFAULT '{}',",
        'ADD COLUMN IF NOT EXISTS starts_at timestamptz,',
        'ADD COLUMN IF NOT EXISTS ends_at timestamptz,',
        "ADD COLUMN IF NOT EXISTS price_list_ids uuid[] NOT NULL DEFAULT '{}'",
      ].join(' ')
    ).catch((err) => {
      offerColumnsReady = null;
      throw err;
    });
  }
  return offerColumnsReady;
}

export async function getTenantOffers(tenantId, { onlyEnabled = false } = {}) {
  if (!tenantId) return [];
  await ensureOfferColumns();

  const params = [tenantId];
  let where = 'tenant_id = $1';
  if (onlyEnabled) {
    where += ' and enabled = true';
  }

  const result = await pool.query(
    [
      'select id, tenant_id, name, label, percent, enabled, user_ids, category_ids,',
      'kind, value, product_ids, price_list_ids, starts_at, ends_at, created_at, updated_at',
      'from tenant_offers',
      `where ${where}`,
      'order by created_at desc',
    ].join(' '),
    params
  );

  return result.rows;
}
