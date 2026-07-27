type RequestedOrderItem = { productId: string; name?: string; quantity: number };
type CatalogOrderProduct = {
  externalProductId: string;
  sku?: string | null;
  name: string;
  price: unknown;
  imageUrl?: string | null;
};

function cents(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

export function publicOrderNumber(orderNumber: string) {
  return orderNumber.replace(/^LABS-/i, "");
}

export function enrichLocalOrderSnapshot<T extends Record<string, unknown> & { items: RequestedOrderItem[] }>(
  snapshot: T,
  catalogProducts: CatalogOrderProduct[],
) {
  const catalogById = new Map(catalogProducts.map((product) => [product.externalProductId, product]));
  const items = snapshot.items.map((item) => {
    const product = catalogById.get(item.productId);
    if (!product) throw new Error(`CATALOG_PRODUCT_NOT_FOUND:${item.productId}`);
    const unitPriceCents = cents(product.price);
    if (unitPriceCents === null) throw new Error(`CATALOG_PRICE_NOT_AVAILABLE:${item.productId}`);
    const quantity = Math.max(1, Math.floor(item.quantity));
    return {
      productId: item.productId,
      sku: product.sku ?? null,
      name: product.name,
      imageUrl: product.imageUrl ?? null,
      quantity,
      unitPrice: unitPriceCents / 100,
      totalAmount: (unitPriceCents * quantity) / 100,
    };
  });
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.totalAmount * 100), 0);
  const shippingCents = cents(snapshot.shippingAmount) ?? 0;
  return {
    ...snapshot,
    items,
    currency: typeof snapshot.currency === "string" ? snapshot.currency : "ARS",
    subtotalAmount: subtotalCents / 100,
    shippingAmount: shippingCents / 100,
    totalAmount: (subtotalCents + shippingCents) / 100,
  };
}
