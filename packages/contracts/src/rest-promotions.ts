export type RestPromotionCandidate = {
  id: string;
  code: string;
  scopeType: string;
  scopeId: string;
  discountType: "PERCENTAGE" | "FIXED_PER_UNIT";
  discountValue: string;
  productIds: string[];
  paymentMethods: string[];
  weekdays: number[];
  minimumQuantity: number;
  startsAt: Date | string;
  endsAt: Date | string;
  priority: number;
  active: boolean;
};

function moneyToCents(value: string) {
  const match = /^(0|[1-9]\d{0,15})\.(\d{2})$/.exec(value);
  if (!match) throw new Error("REST_MONEY_INVALID");
  return BigInt(match[1]) * BigInt(100) + BigInt(match[2]);
}

function centsToMoney(value: bigint) {
  const safe = value < BigInt(0) ? BigInt(0) : value;
  return `${safe / BigInt(100)}.${String(safe % BigInt(100)).padStart(2, "0")}`;
}

function localWeekday(date: Date, timezone: string) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value);
}

export function applyBestRestPromotion(input: {
  now: Date;
  timezone: string;
  globalTenantId: string;
  branchId: string;
  branchGroupIds: string[];
  productId: string;
  quantity: number;
  gross: string;
  paymentMethod?: string;
  promotions: RestPromotionCandidate[];
}) {
  const weekday = localWeekday(input.now, input.timezone);
  const eligible = input.promotions.filter((promotion) => {
    const startsAt = promotion.startsAt instanceof Date
      ? promotion.startsAt : new Date(promotion.startsAt);
    const endsAt = promotion.endsAt instanceof Date
      ? promotion.endsAt : new Date(promotion.endsAt);
    const scopeMatches = promotion.scopeType === "TENANT"
      ? promotion.scopeId === input.globalTenantId
      : promotion.scopeType === "BRANCH"
        ? promotion.scopeId === input.branchId
        : promotion.scopeType === "BRANCH_GROUP" &&
          input.branchGroupIds.includes(promotion.scopeId);
    return promotion.active && scopeMatches &&
      startsAt <= input.now && endsAt >= input.now &&
      (promotion.weekdays.length === 0 || promotion.weekdays.includes(weekday)) &&
      (promotion.productIds.length === 0 ||
        promotion.productIds.includes(input.productId)) &&
      (promotion.paymentMethods.length === 0 ||
        Boolean(input.paymentMethod &&
          promotion.paymentMethods.includes(input.paymentMethod))) &&
      input.quantity >= promotion.minimumQuantity;
  });
  const gross = moneyToCents(input.gross);
  const valued = eligible.map((promotion) => {
    const discount = promotion.discountType === "PERCENTAGE"
      ? gross * BigInt(Math.round(Number(promotion.discountValue) * 10_000)) /
        BigInt(1_000_000)
      : moneyToCents(Number(promotion.discountValue).toFixed(2)) *
        BigInt(input.quantity);
    return { promotion, discount: discount > gross ? gross : discount };
  }).sort((left, right) =>
    right.promotion.priority - left.promotion.priority ||
    (right.discount > left.discount ? 1 : right.discount < left.discount ? -1
      : left.promotion.code.localeCompare(right.promotion.code)));
  const selected = valued[0];
  const discount = selected?.discount ?? BigInt(0);
  return {
    promotionIds: selected ? [selected.promotion.id] : [],
    discountTotal: centsToMoney(discount),
    discountedGross: centsToMoney(gross - discount),
  };
}

function divideRounded(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / BigInt(2)) / denominator;
}

export function priceRestOrderItem(input: {
  unitPrice: string;
  modifierTotal: string;
  quantity: number;
  taxRate: string;
  taxIncluded: boolean;
  promotion: Omit<
    Parameters<typeof applyBestRestPromotion>[0],
    "gross" | "quantity"
  >;
}) {
  const base = (moneyToCents(input.unitPrice) + moneyToCents(input.modifierTotal)) *
    BigInt(input.quantity);
  const rateBasisPoints = BigInt(Math.round(Number(input.taxRate) * 100));
  const grossBeforeDiscount = input.taxIncluded
    ? base
    : divideRounded(
        base * (BigInt(10_000) + rateBasisPoints),
        BigInt(10_000),
      );
  const promotion = applyBestRestPromotion({
    ...input.promotion,
    quantity: input.quantity,
    gross: centsToMoney(grossBeforeDiscount),
  });
  const lineTotal = moneyToCents(promotion.discountedGross);
  const netTotal = rateBasisPoints === BigInt(0)
    ? lineTotal
    : divideRounded(
        lineTotal * BigInt(10_000),
        BigInt(10_000) + rateBasisPoints,
      );
  return {
    grossBeforeDiscount: centsToMoney(grossBeforeDiscount),
    discountTotal: promotion.discountTotal,
    promotionIds: promotion.promotionIds,
    lineTotal: centsToMoney(lineTotal),
    netTotal: centsToMoney(netTotal),
    taxAmount: centsToMoney(lineTotal - netTotal),
  };
}
