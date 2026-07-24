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

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const publicBusinessBaseUrl = () => (
  process.env.INTEGRATIONS_PUBLIC_BASE_URL
  || process.env.PUBLIC_API_URL
  || process.env.API_PUBLIC_URL
  || process.env.PUBLIC_EDITOR_HOST
  || process.env.PUBLIC_STOREFRONT_HOST
  || ''
);

const resolveCandidateUrl = (value, baseUrl = publicBusinessBaseUrl()) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('/')) {
    const base = trimTrailingSlash(baseUrl);
    if (!base) return null;
    return `${base}/${trimmed.replace(/^\/+/, '')}`;
  }
  return trimmed;
};

const asPublicHttpsUrl = (value, baseUrl) => {
  const candidate = resolveCandidateUrl(value, baseUrl);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
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

export const resolveBusinessProductImageUrl = (product, options = {}) => {
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
  return candidates.map((candidate) => asPublicHttpsUrl(candidate, options.baseUrl)).find(Boolean) ?? null;
};

export const mapBusinessProductForLabs = (product, options = {}) => ({
  externalProductId: String(product.external_id || product.erp_id || product.id),
  sku: product.sku ? String(product.sku) : null,
  name: String(product.name || 'Producto'),
  description: product.description ? String(product.description) : null,
  price: product.price === null || product.price === undefined ? null : Number(product.price),
  stock: Math.trunc(Number(product.stock || 0)),
  imageUrl: resolveBusinessProductImageUrl(product, options),
  categories: Array.isArray(product.category_names) ? product.category_names.map(String) : [],
  active: product.is_active_source !== false && !product.deleted_at,
  sourceUpdatedAt: new Date(product.updated_at || product.last_sync_at || Date.now()).toISOString(),
});
