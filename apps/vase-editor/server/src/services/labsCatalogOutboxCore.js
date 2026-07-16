export const nextCatalogRetryDelayMs = (attempt) => Math.min(900_000, 5_000 * (2 ** Math.max(0, attempt - 1)));

export const mapBusinessProductForLabs = (product) => ({
  externalProductId: String(product.external_id || product.erp_id || product.id),
  sku: product.sku ? String(product.sku) : null,
  name: String(product.name || 'Producto'),
  description: product.description ? String(product.description) : null,
  price: product.price === null || product.price === undefined ? null : Number(product.price),
  stock: Math.trunc(Number(product.stock || 0)),
  imageUrl: product.image_url ? String(product.image_url) : null,
  categories: Array.isArray(product.category_names) ? product.category_names.map(String) : [],
  active: product.is_active_source !== false && !product.deleted_at,
  sourceUpdatedAt: new Date(product.updated_at || product.last_sync_at || Date.now()).toISOString(),
});
