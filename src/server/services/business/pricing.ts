import { PriceListType } from "@prisma/client";
import {
  getAssignedPriceListForUser,
  getAutomaticPriceListForSegment,
  getProductPriceOverride,
} from "@/server/queries/business/pricing";
import { roundMoney, toNumber, toOptionalNumber } from "@/server/services/business/shared";

export type PriceAdjustments = {
  retailPercent: number;
  wholesalePercent: number;
  userPercent: number;
  promoEnabled: boolean;
  promoPercent: number;
  promoScope: "retail" | "wholesale" | "both";
  promoLabel: string;
};

export type PricingProfile = {
  segment: "retail" | "wholesale";
  allowWholesale: boolean;
  pendingWholesale: boolean;
  priceList: {
    id: string;
    name: string;
    type: PriceListType;
    rulesJson: unknown;
  } | null;
  priceListSource: "manual" | "automatic" | "none";
};

export function normalizePriceAdjustments(raw: unknown): PriceAdjustments {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const promoScopeValue = String(source.promoScope ?? source.promo_scope ?? "both").toLowerCase();
  const promoScope =
    promoScopeValue === "retail" || promoScopeValue === "wholesale" ? promoScopeValue : "both";

  return {
    retailPercent: toNumber(source.retailPercent ?? source.retail_percent, 0),
    wholesalePercent: toNumber(source.wholesalePercent ?? source.wholesale_percent, 0),
    userPercent: toNumber(source.userPercent ?? source.user_percent, 0),
    promoEnabled: Boolean(source.promoEnabled ?? source.promo_enabled),
    promoPercent: toNumber(source.promoPercent ?? source.promo_percent, 0),
    promoScope,
    promoLabel: String(source.promoLabel ?? source.promo_label ?? "Oferta"),
  };
}

export function normalizePriceListRules(raw: unknown) {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const forceSegmentValue = String(source.forceSegment ?? source.force_segment ?? "").toLowerCase();

  return {
    percent: toNumber(source.percent, 0),
    forceSegment:
      forceSegmentValue === "retail" || forceSegmentValue === "wholesale" ? forceSegmentValue : null,
    minPrice: toOptionalNumber(source.minPrice ?? source.min_price),
    maxPrice: toOptionalNumber(source.maxPrice ?? source.max_price),
  };
}

export function applyPriceAdjustments(basePrice: number, segment: "retail" | "wholesale", adjustments: PriceAdjustments) {
  let price = toNumber(basePrice, 0);
  const segmentPercent = segment === "wholesale" ? adjustments.wholesalePercent : adjustments.retailPercent;

  if (segmentPercent !== 0) {
    price = price * (1 + segmentPercent / 100);
  }

  if (adjustments.userPercent !== 0) {
    price = price * (1 + adjustments.userPercent / 100);
  }

  if (adjustments.promoEnabled && adjustments.promoPercent !== 0) {
    if (adjustments.promoScope === "both" || adjustments.promoScope === segment) {
      price = price * (1 - adjustments.promoPercent / 100);
    }
  }

  return roundMoney(Math.max(0, price));
}

export function applyPriceListRules(basePrice: number, rules: ReturnType<typeof normalizePriceListRules>) {
  let nextPrice = toNumber(basePrice, 0);

  if (rules.percent !== 0) {
    nextPrice = nextPrice * (1 + rules.percent / 100);
  }
  if (rules.minPrice != null) {
    nextPrice = Math.max(nextPrice, rules.minPrice);
  }
  if (rules.maxPrice != null) {
    nextPrice = Math.min(nextPrice, rules.maxPrice);
  }

  return roundMoney(Math.max(0, nextPrice));
}

export async function resolvePricingProfile(input: {
  tenantId: string;
  userId?: string | null;
  customerType?: "retail" | "wholesale";
}) {
  const allowWholesale = input.customerType === "wholesale";
  const segment: "retail" | "wholesale" = allowWholesale ? "wholesale" : "retail";

  if (!input.userId) {
    return {
      segment,
      allowWholesale,
      pendingWholesale: false,
      priceList: null,
      priceListSource: "none",
    } satisfies PricingProfile;
  }

  const assigned = await getAssignedPriceListForUser(input.tenantId, input.userId);
  if (assigned?.priceList) {
    return {
      segment,
      allowWholesale,
      pendingWholesale: false,
      priceList: {
        id: assigned.priceList.id,
        name: assigned.priceList.name,
        type: assigned.priceList.type,
        rulesJson: assigned.priceList.rulesJson,
      },
      priceListSource: "manual",
    } satisfies PricingProfile;
  }

  const automatic = await getAutomaticPriceListForSegment(
    input.tenantId,
    allowWholesale ? PriceListType.WHOLESALE : PriceListType.RETAIL,
  );

  return {
    segment,
    allowWholesale,
    pendingWholesale: false,
    priceList: automatic
      ? {
          id: automatic.id,
          name: automatic.name,
          type: automatic.type,
          rulesJson: automatic.rulesJson,
        }
      : null,
    priceListSource: automatic ? "automatic" : "none",
  } satisfies PricingProfile;
}

export async function resolveEffectiveProductPrice(input: {
  tenantId: string;
  productId: string;
  priceRetail: number;
  priceWholesale: number | null;
  profile: PricingProfile;
  adjustments?: PriceAdjustments;
}) {
  const adjustments = input.adjustments ?? normalizePriceAdjustments({});
  const override = await getProductPriceOverride(input.tenantId, input.productId);
  const rules = normalizePriceListRules(input.profile.priceList?.rulesJson);

  const retailBase = toOptionalNumber(override?.priceRetail) ?? input.priceRetail;
  const wholesaleBase = toOptionalNumber(override?.priceWholesale) ?? input.priceWholesale;

  const retail = applyPriceAdjustments(retailBase, "retail", adjustments);
  const wholesale =
    wholesaleBase != null ? applyPriceAdjustments(wholesaleBase, "wholesale", adjustments) : null;

  const forcedSegment =
    rules.forceSegment === "wholesale" && input.profile.allowWholesale ? "wholesale" : rules.forceSegment;
  const priceSegment = forcedSegment || input.profile.segment;
  const basePrice = priceSegment === "wholesale" && wholesale != null ? wholesale : retail;
  const effective = applyPriceListRules(basePrice, rules);

  return {
    retail,
    wholesale: input.profile.allowWholesale ? wholesale : null,
    effective,
    segment: priceSegment,
    override,
    priceList: input.profile.priceList,
    pendingWholesale: input.profile.pendingWholesale,
  };
}
