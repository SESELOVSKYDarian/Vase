export function allowedPromotionTenderTypes(input: {
  promotionIds: string[];
  promotions: Array<{ id: string; paymentMethods: unknown }>;
}) {
  const used = new Set(input.promotionIds);
  const restrictions = input.promotions
    .filter((promotion) => used.has(promotion.id))
    .map((promotion) =>
      Array.isArray(promotion.paymentMethods)
        ? promotion.paymentMethods.map(String) : [])
    .filter((methods) => methods.length > 0);
  if (!restrictions.length) return undefined;
  return restrictions.slice(1).reduce(
    (allowed, methods) => allowed.filter((method) => methods.includes(method)),
    restrictions[0],
  ).sort();
}
