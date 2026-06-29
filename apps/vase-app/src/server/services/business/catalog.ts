import { listCatalogProductsByTenant } from "@/server/queries/business/catalog";
import { getActiveOffersContext, resolveBestOfferForProduct, applyOfferDiscount } from "@/server/services/business/offers";
import { resolveEffectiveProductPrice, resolvePricingProfile, type PriceAdjustments } from "@/server/services/business/pricing";
import { asStringArray, toNumber } from "@/server/services/business/shared";

function getComparablePrice(item: { price: number; priceRange?: { min: number } | null }) {
  return item.priceRange?.min ?? item.price;
}

function sortCatalogProducts(items: Array<{ name: string; price: number; priceRange?: { min: number } | null; stock: number }>, sort: string) {
  const collator = new Intl.Collator("es", { sensitivity: "base" });
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sort === "price-asc") return getComparablePrice(a) - getComparablePrice(b);
    if (sort === "price-desc") return getComparablePrice(b) - getComparablePrice(a);
    if (sort === "stock-asc") return a.stock - b.stock;
    if (sort === "stock-desc") return b.stock - a.stock;
    if (sort === "name-desc") return collator.compare(b.name, a.name);
    return collator.compare(a.name, b.name);
  });

  return sorted;
}

export async function buildCatalogListing(input: {
  tenantId: string;
  userId?: string | null;
  customerType?: "retail" | "wholesale";
  adjustments?: PriceAdjustments;
  search?: string;
  categorySlug?: string;
  collectionSlug?: string;
  publicOnly?: boolean;
  sort?: string;
}) {
  const [products, profile, offers] = await Promise.all([
    listCatalogProductsByTenant(input.tenantId, {
      search: input.search,
      categorySlug: input.categorySlug,
      collectionSlug: input.collectionSlug,
      publicOnly: input.publicOnly ?? true,
    }),
    resolvePricingProfile({
      tenantId: input.tenantId,
      userId: input.userId,
      customerType: input.customerType,
    }),
    getActiveOffersContext(input.tenantId),
  ]);

  const mapped = await Promise.all(
    products.map(async (product) => {
      const categoryIds = product.categories.map((entry) => entry.categoryId);
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
        categoryIds,
        userId: input.userId,
      });
      const finalPrice = applyOfferDiscount(pricing.effective, bestOffer.percent);
      const variationGroup = String(
        (product.attributes as Record<string, unknown> | null)?.variant_group ??
          (product.attributes as Record<string, unknown> | null)?.variantGroup ??
          "",
      ).trim();
      const variationLabel = String(
        (product.attributes as Record<string, unknown> | null)?.variant_label ??
          (product.attributes as Record<string, unknown> | null)?.variantLabel ??
          "",
      ).trim();

      return {
        id: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        description: product.description,
        shortDescription: product.shortDescription,
        currency: product.currency,
        stock: product.stock,
        images: asStringArray(product.images),
        categories: product.categories.map((entry) => ({
          id: entry.category.id,
          slug: entry.category.slug,
          name: entry.category.name,
        })),
        price: finalPrice,
        pricing,
        offer: bestOffer.percent > 0 ? bestOffer : null,
        variationGroup: variationGroup || null,
        variationLabel: variationLabel || null,
      };
    }),
  );

  return sortCatalogProducts(mapped, input.sort || "name-asc");
}
