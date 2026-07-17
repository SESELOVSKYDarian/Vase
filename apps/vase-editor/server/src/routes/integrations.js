import { Router } from 'express';
import multer from 'multer';

import {
  getProductSyncSchemaController,
  syncCompatibilityFtpImagesController,
  syncCompatibilityProductsController,
  syncFtpImagesController,
  syncProductsController,
  uploadIntegrationImageController,
} from '../controllers/integration.controller.js';
import { requireApiScope, validateApiKey, validateCompatibilityConsumerCredentials } from '../middleware/apiKey.js';
import { ensureProductSyncSchema } from '../services/integration.service.js';
import { syncIntegrationProducts } from '../services/integration.service.js';
import { pool } from '../db.js';
import { enqueueLabsCatalogSync, processLabsCatalogOutbox } from '../services/labsCatalogOutbox.js';
import { createProductSyncCredentialsHandler } from '../services/productSyncCredentials.js';

export const integrationsRouter = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ]);

    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    const error = new Error('invalid_image_type');
    error.status = 415;
    error.code = 'invalid_image_type';
    cb(error);
  },
});

const handleMulterError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      error: err.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'upload_error',
      detail: err.code,
    });
  }

  if (err.code || err.status) {
    return res.status(err.status || 400).json({
      error: err.code || 'upload_error',
    });
  }

  return next(err);
};

integrationsRouter.get(
  '/internal/tenant/:tenantId/product-sync-credentials',
  (req, res, next) => createProductSyncCredentialsHandler({
    db: pool,
    expectedServiceToken: process.env.SERVICE_TO_SERVICE_TOKEN,
  })(req, res, next)
);

integrationsRouter.use(async (req, res, next) => {
  try {
    await ensureProductSyncSchema();
    return next();
  } catch (err) {
    return next(err);
  }
});

integrationsRouter.get('/schema/product', getProductSyncSchemaController);

integrationsRouter.post('/management/events', async (req, res, next) => {
  try {
    const expected = String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim();
    const supplied = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!expected || supplied !== expected) return res.status(403).json({ error: 'forbidden' });
    const event = req.body || {};
    if (!event.eventId || !event.globalTenantId || event.entity !== 'PRODUCT') return res.status(400).json({ error: 'invalid_management_event' });
    await pool.query(`create table if not exists management_event_receipts (event_id text primary key, tenant_id text not null, version integer not null, processed_at timestamptz not null default now())`);
    const prior = await pool.query('select event_id from management_event_receipts where event_id = $1', [event.eventId]);
    if (prior.rowCount) return res.json({ ok: true, duplicate: true });
    const item = { external_id: event.externalId, sku: event.payload?.sku, name: event.payload?.name, description: event.payload?.description, price: event.payload?.price, stock: event.payload?.stock, active: event.action !== 'ARCHIVE', source_updated_at: event.occurredAt };
    const result = await syncIntegrationProducts({ tenantId: event.globalTenantId, items: [item], sourceSystem: 'vase_management' });
    await pool.query('insert into management_event_receipts (event_id, tenant_id, version) values ($1, $2, $3)', [event.eventId, event.globalTenantId, event.version]);
    await enqueueLabsCatalogSync(event.globalTenantId);
    void processLabsCatalogOutbox({ limit: 1 });
    return res.json({ ok: true, result });
  } catch (error) { return next(error); }
});

integrationsRouter.get('/ping', validateApiKey, requireApiScope('products:sync'), (req, res) => {
  return res.json({
    ok: true,
    tenant_id: req.tenantId,
    token_name: req.apiKey?.name || null,
    scope: req.apiKey?.scope || null,
    server_time: new Date().toISOString(),
  });
});

integrationsRouter.post('/products/sync', validateApiKey, requireApiScope('products:sync'), syncProductsController);
integrationsRouter.post(
  '/images/upload',
  validateApiKey,
  requireApiScope('products:sync'),
  imageUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  handleMulterError,
  uploadIntegrationImageController
);
integrationsRouter.post('/images/ftp/sync', validateApiKey, requireApiScope('products:sync'), syncFtpImagesController);

integrationsRouter.get('/gestion/ping', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), (req, res) => {
  return res.json({
    ok: true,
    mode: 'consumer_key_secret',
    tenant_id: req.tenantId,
    token_name: req.apiKey?.name || null,
    scope: req.apiKey?.scope || null,
    server_time: new Date().toISOString(),
  });
});
integrationsRouter.get('/compat/ping', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), (req, res) => {
  return res.json({
    ok: true,
    mode: 'consumer_key_secret',
    tenant_id: req.tenantId,
    token_name: req.apiKey?.name || null,
    scope: req.apiKey?.scope || null,
    server_time: new Date().toISOString(),
  });
});

integrationsRouter.post('/gestion/producto', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), syncCompatibilityProductsController);
integrationsRouter.post('/gestion/productos', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), syncCompatibilityProductsController);
integrationsRouter.post('/gestion/imagenes/ftp', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), syncCompatibilityFtpImagesController);
integrationsRouter.post('/gestion/imagenes/sync', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), syncCompatibilityFtpImagesController);
integrationsRouter.post('/compat/products/sync', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), syncCompatibilityProductsController);
integrationsRouter.post('/compat/images/ftp/sync', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), syncCompatibilityFtpImagesController);
