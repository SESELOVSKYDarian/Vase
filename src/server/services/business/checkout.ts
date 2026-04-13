import { getCheckoutProductsSnapshot } from "@/server/queries/business/checkout";
import { getActiveOffersContext, resolveBestOfferForProduct, applyOfferDiscount } from "@/server/services/business/offers";
import { resolveEffectiveProductPrice, resolvePricingProfile, type PriceAdjustments } from "@/server/services/business/pricing";
import { resolveShippingQuote } from "@/server/services/business/shipping";
import { roundMoney, toNumber } from "@/server/services/business/shared";

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

export function normalizePaymentMethod(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["transfer", "online", "cash_on_pickup", "email", "whatsapp"].includes(normalized)) {
    return normalized;
  }
  return "manual";
}

export function normalizeOrderChannel(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "email") return "email";
  if (normalized === "whatsapp") return "whatsapp";
  return "web";
}

export function normalizeItems(items: CheckoutItemInput[]) {
  return Array.isArray(items)
    ? items
        .filter((item) => item && item.productId)
        .map((item) => ({
          productId: item.productId,
          quantity: Math.max(1, Number(item.quantity || 1)),
        }))
    : [];
}

export async function validateCheckoutItems(input: {
  tenantId: string;
  items: CheckoutItemInput[];
  userId?: string | null;
  customerType?: "retail" | "wholesale";
  adjustments?: PriceAdjustments;
  shippingCustomer?: {
    shippingLocation?: {
      latitude?: number | null;
      longitude?: number | null;
      lat?: number | null;
      lng?: number | null;
    } | null;
    shippingLatitude?: number | null;
    shippingLongitude?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  preferredBranchId?: string | null;
}) {
  const normalizedItems = normalizeItems(input.items);
  if (!normalizedItems.length) {
    return { valid: false, errors: ["empty_items"] as string[] };
  }

  const [products, profile, offers] = await Promise.all([
    getCheckoutProductsSnapshot(
      input.tenantId,
      normalizedItems.map((item) => item.productId),
    ),
    resolvePricingProfile({
      tenantId: input.tenantId,
      userId: input.userId,
      customerType: input.customerType,
    }),
    getActiveOffersContext(input.tenantId),
  ]);

  const errors: string[] = [];
  let subtotal = 0;
  let currency = "ARS";

  const lineItems = await Promise.all(
    normalizedItems.map(async (item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) {
        errors.push(`product_not_found:${item.productId}`);
        return null;
      }

      if (product.stock < item.quantity) {
        errors.push(`insufficient_stock:${product.id}`);
      }

      currency = product.currency || currency;
      const pricing = await resolveEffectiveProductPrice({
        tenantId: input.tenantId,
        productId: product.id,
        priceRetail: toNumber(product.priceRetail, 0),
        priceWholesale: product.priceWholesale == null ? null : toNumber(product.priceWholesale, 0),
        profile,
        adjustments: input.adjustments,
      });
      const bestOffer = resolveBestOfferForProduct({
        offers,
        productId: product.id,
        categoryIds: product.categories.map((entry) => entry.categoryId),
        userId: input.userId,
      });
      const unitPrice = applyOfferDiscount(pricing.effective, bestOffer.percent);
      const totalAmount = roundMoney(unitPrice * item.quantity);
      subtotal += totalAmount;

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        totalAmount,
        currency,
        snapshot: {
          slug: product.slug,
          brand: product.brand,
          images: product.images,
          offer: bestOffer.percent > 0 ? bestOffer : null,
        },
      };
    }),
  );

  const shippingQuote = input.shippingCustomer
    ? await resolveShippingQuote({
        tenantId: input.tenantId,
        customer: input.shippingCustomer,
        preferredBranchId: input.preferredBranchId,
      })
    : null;

  const shippingAmount = shippingQuote?.ok ? shippingQuote.amount : 0;

  return {
    valid: errors.length === 0,
    errors,
    currency,
    subtotal: roundMoney(subtotal),
    shippingAmount,
    total: roundMoney(subtotal + shippingAmount),
    items: lineItems.filter(Boolean),
    shippingQuote,
  };
}
