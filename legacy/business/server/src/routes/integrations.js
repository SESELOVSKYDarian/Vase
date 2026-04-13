import { Router } from 'express';

import { syncCompatibilityProductsController, syncProductsController } from '../controllers/integration.controller.js';
import { requireApiScope, validateApiKey, validateCompatibilityConsumerCredentials } from '../middleware/apiKey.js';
import { buildProductSyncSchema, resolveServerBaseUrl } from '../services/integrationManifest.js';
import { ensureProductSyncSchema } from '../services/integration.service.js';

export const integrationsRouter = Router();

integrationsRouter.use(async (req, res, next) => {
  try {
    await ensureProductSyncSchema();
    return next();
  } catch (err) {
    return next(err);
  }
});

integrationsRouter.get('/schema/product', (req, res) => {
  const baseUrl = resolveServerBaseUrl(req);
  return res.json(buildProductSyncSchema(baseUrl));
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
integrationsRouter.post('/compat/products/sync', validateCompatibilityConsumerCredentials, requireApiScope('products:sync'), syncCompatibilityProductsController);
