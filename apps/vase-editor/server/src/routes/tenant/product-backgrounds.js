// Quitar el fondo de las fotos del catálogo, desde el panel de la tienda.
// - GET  /products/backgrounds            estado: cuántos productos faltan, si está corriendo y si el automático está prendido.
// - POST /products/backgrounds/run        quita el fondo a todo el catálogo (en segundo plano). { again: true } revisa todo de nuevo.
// - POST /products/backgrounds/auto       prende o apaga el quitado automático de las fotos nuevas. { enabled }
// - POST /products/backgrounds/restore    vuelve a poner las fotos originales.
// - POST /products/:id/remove-background  quita el fondo a las fotos de un producto (espera el resultado).
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { getTenantId, isUuid } from './helpers-common.js';
import {
  countPendingProducts,
  ensureCutoutsSchema,
  getCutoutStatus,
  processTenantCatalog,
  processWholeCatalogInBackground,
  resetTenantCutouts,
  restoreTenantOriginals,
} from '../../services/backgroundRemoval/catalogCutouts.js';
import { getDefaultAutoTenantIds, isAutoRemoveEnabled } from '../../services/backgroundRemoval/scheduler.js';

/** Lee si la tienda tiene prendido el quitado automático (lo que configuró, o el valor de entrada). */
async function readAutoSetting(tenantId) {
  const row = (await pool.query('select commerce from tenant_settings where tenant_id = $1', [tenantId])).rows[0];
  return isAutoRemoveEnabled(row?.commerce, tenantId, getDefaultAutoTenantIds());
}

tenantRouter.get('/products/backgrounds', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    await ensureCutoutsSchema();
    return res.json({ status: getCutoutStatus(tenantId), pending: await countPendingProducts(tenantId), auto: await readAutoSetting(tenantId) });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/products/backgrounds/run', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    await ensureCutoutsSchema();
    if (req.body?.again === true) await resetTenantCutouts(tenantId);
    const started = processWholeCatalogInBackground(tenantId);
    return res.status(202).json({ started, pending: await countPendingProducts(tenantId) });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/products/backgrounds/auto', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  const enabled = req.body?.enabled === true;
  try {
    await pool.query(
      `insert into tenant_settings (tenant_id, commerce) values ($1, jsonb_build_object('auto_remove_backgrounds', $2::boolean))
       on conflict (tenant_id) do update set commerce = coalesce(tenant_settings.commerce, '{}'::jsonb) || jsonb_build_object('auto_remove_backgrounds', $2::boolean), updated_at = now()`,
      [tenantId, enabled]
    );
    return res.json({ auto: enabled });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/products/backgrounds/restore', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    return res.json({ restored: await restoreTenantOriginals(tenantId) });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/products/:id/remove-background', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'invalid_product_id' });
  try {
    await ensureCutoutsSchema();
    await resetTenantCutouts(tenantId, req.params.id);
    const status = await processTenantCatalog(tenantId, { productId: req.params.id });
    if (status.state === 'running' && !status.finishedAt) return res.status(409).json({ error: 'catalog_in_progress' });
    const product = (await pool.query("select data->'images' as images from product_cache where id = $1 and tenant_id = $2", [req.params.id, tenantId])).rows[0];
    return res.json({ changed: status.images || 0, images: product?.images || [] });
  } catch (err) {
    return next(err);
  }
});
