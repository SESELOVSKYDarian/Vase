import { syncIntegrationProducts } from '../services/integration.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const PRODUCT_ALIAS_KEYS = [
  'external_id',
  'externalId',
  'id',
  'sku',
  'codigo',
  'codigo_propio',
  'codigoPropio',
  'codigo_producto',
  'product_code',
  'name',
  'title',
  'titulo',
  'detalle_ampliado',
  'detalleAmpliado',
];

const readExternalIdFromItem = (item) =>
  String(
    item?.external_id ??
    item?.externalId ??
    item?.id ??
    item?.sku ??
    item?.codigo ??
    item?.codigo_propio ??
    item?.codigoPropio ??
    item?.codigo_producto ??
    item?.product_code ??
    ''
  ).trim();

const tryParseJsonValue = (value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  if (!normalized) return value;

  if (!normalized.startsWith('{') && !normalized.startsWith('[')) {
    return value;
  }

  try {
    return JSON.parse(normalized);
  } catch (err) {
    return value;
  }
};

const normalizeIncomingBody = (body) => {
  const parsedBody = tryParseJsonValue(body);
  if (Array.isArray(parsedBody)) {
    return parsedBody;
  }

  if (!isPlainObject(parsedBody)) {
    return {};
  }

  const next = { ...parsedBody };
  ['payload', 'json', 'data', 'producto', 'product', 'products', 'items', 'articulo', 'article'].forEach((key) => {
    if (next[key] !== undefined) {
      next[key] = tryParseJsonValue(next[key]);
    }
  });
  return next;
};

const resolveIntegrationTenantId = (req) => {
  const tokenTenantId = String(req.tenantId || req.apiKey?.tenant_id || '').trim();
  const headerTenantId = String(req.get('x-tenant-id') || '').trim();

  if (tokenTenantId && headerTenantId && tokenTenantId !== headerTenantId) {
    return { error: 'tenant_mismatch' };
  }

  const tenantId = tokenTenantId || headerTenantId || null;
  if (!tenantId) {
    return { error: 'tenant_required' };
  }
  if (!UUID_REGEX.test(tenantId)) {
    return { error: 'invalid_tenant_id' };
  }

  return { tenantId };
};

const resolveItemsPayload = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.productos)) return body.productos;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.payload)) return body.payload;
  if (isPlainObject(body?.data)) return resolveItemsPayload(body.data);
  if (isPlainObject(body?.payload)) return resolveItemsPayload(body.payload);
  if (isPlainObject(body?.json)) return resolveItemsPayload(body.json);
  if (isPlainObject(body?.item)) return [body.item];
  if (isPlainObject(body?.product)) return [body.product];
  if (isPlainObject(body?.producto)) return [body.producto];
  if (isPlainObject(body?.article)) return [body.article];
  if (isPlainObject(body?.articulo)) return [body.articulo];

  if (isPlainObject(body)) {
    const hasProductLikeKey = PRODUCT_ALIAS_KEYS.some((key) => Object.prototype.hasOwnProperty.call(body, key));
    if (hasProductLikeKey) {
      return [body];
    }
  }
  return null;
};

async function handleSyncProductsRequest(req, res, next, { defaultSourceSystem = 'erp' } = {}) {
  try {
    const tenantResolution = resolveIntegrationTenantId(req);
    if (tenantResolution.error) {
      const status = tenantResolution.error === 'tenant_mismatch' ? 403 : 400;
      return res.status(status).json({ error: tenantResolution.error });
    }

    const normalizedBody = normalizeIncomingBody(req.body);
    const items = resolveItemsPayload(normalizedBody);
    if (!items) {
      return res.status(400).json({ error: 'products_array_required' });
    }

    const sourceSystem = String(
      normalizedBody?.source_system ||
      normalizedBody?.sourceSystem ||
      req.get('x-source-system') ||
      defaultSourceSystem
    ).trim() || defaultSourceSystem;

    const result = await syncIntegrationProducts({
      tenantId: tenantResolution.tenantId,
      items,
      sourceSystem,
    });

    return res.json(result);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
}

export async function syncProductsController(req, res, next) {
  return handleSyncProductsRequest(req, res, next, {
    defaultSourceSystem: 'erp',
  });
}

export async function syncCompatibilityProductsController(req, res, next) {
  return handleSyncProductsRequest(req, res, next, {
    defaultSourceSystem: 'gestion-compat',
  });
}
