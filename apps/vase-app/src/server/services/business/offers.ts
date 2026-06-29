import { listTenantOffers } from "@/server/queries/business/offers";
import { asStringArray, roundMoney, toNumber } from "@/server/services/business/shared";

export function applyOfferDiscount(price: number, percent: number) {
  const safePrice = toNumber(price, 0);
  const safePercent = toNumber(percent, 0);
  if (safePercent <= 0) {
    return roundMoney(safePrice);
  }

  return roundMoney(Math.max(0, safePrice * (1 - safePercent / 100)));
}

function isOfferActive(offer: {
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  const now = new Date();
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt < now) return false;
  return true;
}

function isOfferMatchUser(offer: { targetUserIds: unknown }, userId?: string | null) {
  const targets = asStringArray(offer.targetUserIds);
  if (!targets.length) return true;
  if (!userId) return false;
  return targets.includes(userId);
}

function isOfferMatchCategory(offer: { targetCategoryIds: unknown }, categoryIds: string[]) {
  const targets = asStringArray(offer.targetCategoryIds);
  if (!targets.length) return true;
  return targets.some((id) => categoryIds.includes(id));
}

function isOfferMatchProduct(offer: { targetProductIds: unknown }, productId: string) {
  const targets = asStringArray(offer.targetProductIds);
  if (!targets.length) return true;
  return targets.includes(productId);
}

export async function getActiveOffersContext(tenantId: string) {
  const offers = await listTenantOffers(tenantId, true);
  return offers.filter(isOfferActive);
}

export function resolveBestOfferForProduct(input: {
  offers: Array<{
    id: string;
    name: string;
    label: string | null;
    percent: unknown;
    targetUserIds: unknown;
    targetCategoryIds: unknown;
    targetProductIds: unknown;
    startsAt: Date | null;
    endsAt: Date | null;
  }>;
  productId: string;
  categoryIds: string[];
  userId?: string | null;
}) {
  const activeOffers = input.offers.filter((offer) => {
    if (!isOfferActive(offer)) return false;
    if (!isOfferMatchUser(offer, input.userId)) return false;
    if (!isOfferMatchCategory(offer, input.categoryIds)) return false;
    if (!isOfferMatchProduct(offer, input.productId)) return false;
    return toNumber(offer.percent, 0) > 0;
  });

  if (!activeOffers.length) {
    return { id: null, label: null, percent: 0 };
  }

  const best = activeOffers.sort((a, b) => toNumber(b.percent, 0) - toNumber(a.percent, 0))[0];
  return {
    id: best.id,
    label: best.label || best.name || "Oferta",
    percent: toNumber(best.percent, 0),
  };
}
