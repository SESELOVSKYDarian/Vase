import { isIP } from 'node:net';

export const nextCatalogRetryDelayMs = (attempt) => Math.min(900_000, 5_000 * (2 ** Math.max(0, attempt - 1)));

const nonPublicHostSuffixes = [
  '.example',
  '.invalid',
  '.test',
  '.internal',
  '.home',
  '.lan',
  '.localhost',
  '.local',
];

const asPublicHttpsUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || !hostname.includes('.')
      || hostname === 'localhost'
      || nonPublicHostSuffixes.some((suffix) => hostname.endsWith(suffix))
      || isIP(hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

export const resolveBusinessProductImageUrl = (product) => {
  const data = product?.data && typeof product.data === 'object' ? product.data : {};
  const images = Array.isArray(data.images) ? data.images : [];
  const candidates = [
    product?.image_url,
    data.image_url,
    data.imageUrl,
    data.image,
    ...images.flatMap((image) => (
      typeof image === 'string' ? [image] : [image?.url, image?.src, image?.image_url]
    )),
  ];
  return candidates.map(asPublicHttpsUrl).find(Boolean) ?? null;
};

export const mapBusinessProductForLabs = (product) => ({
  externalProductId: String(product.external_id || product.erp_id || product.id),
  sku: product.sku ? String(product.sku) : null,
  name: String(product.name || 'Producto'),
  description: product.description ? String(product.description) : null,
  price: product.price === null || product.price === undefined ? null : Number(product.price),
  stock: Math.trunc(Number(product.stock || 0)),
  imageUrl: resolveBusinessProductImageUrl(product),
  categories: Array.isArray(product.category_names) ? product.category_names.map(String) : [],
  active: product.is_active_source !== false && !product.deleted_at,
  sourceUpdatedAt: new Date(product.updated_at || product.last_sync_at || Date.now()).toISOString(),
});
