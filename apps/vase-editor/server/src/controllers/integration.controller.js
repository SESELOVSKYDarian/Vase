import { syncProductImagesFromFtp } from '../services/integrationFtpImages.service.js';
import { buildProductSyncSchemaForRequest, resolveServerBaseUrl } from '../services/integrationManifest.js';
import { syncIntegrationProducts } from '../services/integration.service.js';
import { resolveUploadsPublicBaseUrl } from '../services/uploadPublicUrl.js';
import {
  buildProductUploadsUsername,
  uploadBufferToUploadsService,
} from '../services/uploadsService.js';

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
  [
    'payload',
    'json',
    'data',
    'producto',
    'product',
    'products',
    'items',
    'articulo',
    'article',
    'ftp',
    'options',
    'config',
    'configuration',
  ].forEach((key) => {
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

const resolveFtpSyncPayload = (body) => {
  if (!isPlainObject(body)) return {};

  if (isPlainObject(body.payload)) return body.payload;
  if (isPlainObject(body.data)) return body.data;
  if (isPlainObject(body.ftp_sync)) return body.ftp_sync;
  if (isPlainObject(body.ftpSync)) return body.ftpSync;
  return body;
};

async function handleSyncFtpImagesRequest(req, res, next) {
  try {
    const tenantResolution = resolveIntegrationTenantId(req);
    if (tenantResolution.error) {
      const status = tenantResolution.error === 'tenant_mismatch' ? 403 : 400;
      return res.status(status).json({ error: tenantResolution.error });
    }

    const normalizedBody = normalizeIncomingBody(req.body);
    const payload = resolveFtpSyncPayload(normalizedBody);

    const result = await syncProductImagesFromFtp({
      tenantId: tenantResolution.tenantId,
      baseUrl: resolveServerBaseUrl(req),
      uploadsBaseUrl: resolveUploadsPublicBaseUrl(req),
      payload,
    });

    return res.json(result);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({
        error: err.code,
        detail: err.detail || null,
      });
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

export async function syncFtpImagesController(req, res, next) {
  return handleSyncFtpImagesRequest(req, res, next);
}

export async function syncCompatibilityFtpImagesController(req, res, next) {
  return handleSyncFtpImagesRequest(req, res, next);
}

export async function uploadIntegrationImageController(req, res, next) {
  try {
    const tenantResolution = resolveIntegrationTenantId(req);
    if (tenantResolution.error) {
      const status = tenantResolution.error === 'tenant_mismatch' ? 403 : 400;
      return res.status(status).json({ error: tenantResolution.error });
    }

    const uploadedFile = req.file || req.files?.file?.[0] || req.files?.image?.[0] || null;
    if (!uploadedFile?.buffer) {
      return res.status(400).json({ error: 'file_required' });
    }

    const uploadUsername = buildProductUploadsUsername(tenantResolution.tenantId);
    const uploaded = await uploadBufferToUploadsService({
      buffer: uploadedFile.buffer,
      originalName: uploadedFile.originalname,
      mimeType: uploadedFile.mimetype,
      username: uploadUsername,
      tenantId: tenantResolution.tenantId,
    });

    return res.status(201).json({
      ok: true,
      tenant_id: tenantResolution.tenantId,
      folder: uploadUsername,
      filename: uploaded.filename,
      original_name: uploadedFile.originalname,
      size: uploadedFile.size,
      mime_type: uploadedFile.mimetype,
      url: uploaded.public_url,
      public_url: uploaded.public_url,
      storage: 'uploads-service',
      usage: 'Enviar esta URL en el campo images del producto.',
    });
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({
        error: err.code,
        detail: err.detail || null,
      });
    }
    return next(err);
  }
}

export function getProductSyncSchemaController(req, res) {
  return res.json(buildProductSyncSchemaForRequest(req));
}
