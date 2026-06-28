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

integrationsRouter.use(async (req, res, next) => {
  try {
    await ensureProductSyncSchema();
    return next();
  } catch (err) {
    return next(err);
  }
});

integrationsRouter.get('/schema/product', getProductSyncSchemaController);

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
