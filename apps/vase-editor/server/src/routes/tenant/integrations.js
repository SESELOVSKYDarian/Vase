// Conexión con el sistema de gestión: datos de la sincronización, proveedor y token.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { buildTenantIntegrationManifest, resolveServerBaseUrl } from '../../services/integrationManifest.js';
import { createProductSyncTokenValue, ensureProductSyncToken } from '../../services/productSyncCredentials.js';
import { getTenantId } from './helpers-common.js';

tenantRouter.get('/integrations/product-sync', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const { tokenRecord, autoCreated } = await ensureProductSyncToken(pool, tenantId);
    const baseUrl = resolveServerBaseUrl(req);
    return res.json({
      ...buildTenantIntegrationManifest({
        baseUrl,
        tenantId,
        tokenRecord,
      }),
      token_auto_created: autoCreated,
    });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.get('/integrations/provider', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    const url = new URL('/api/internal/management/provider', process.env.VASE_APP_INTERNAL_URL || 'http://vase-app:3001');
    url.searchParams.set('globalTenantId', tenantId);
    const response = await fetch(url, { headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN || ''}` } });
    return res.status(response.status).json(await response.json());
  } catch (error) { return next(error); }
});

tenantRouter.post('/integrations/provider', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    const response = await fetch(new URL('/api/internal/management/provider', process.env.VASE_APP_INTERNAL_URL || 'http://vase-app:3001'), { method: 'POST', headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN || ''}`, 'content-type': 'application/json' }, body: JSON.stringify({ globalTenantId: tenantId, provider: req.body?.provider }) });
    return res.status(response.status).json(await response.json());
  } catch (error) { return next(error); }
});

tenantRouter.post('/integrations/product-sync/token/rotate', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const tokenName = String(req.body?.name || 'ERP Sync').trim() || 'ERP Sync';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      "delete from api_tokens where tenant_id = $1 and scope = 'products:sync'",
      [tenantId]
    );

    const tokenValue = createProductSyncTokenValue();
    const insertRes = await client.query(
      [
        'insert into api_tokens (tenant_id, name, token_hash, scope)',
        'values ($1, $2, $3, $4)',
        'returning id, name, token_hash, scope, created_at',
      ].join(' '),
      [tenantId, tokenName, tokenValue, 'products:sync']
    );

    await client.query('COMMIT');
    const baseUrl = resolveServerBaseUrl(req);

    return res.json({
      ...buildTenantIntegrationManifest({
        baseUrl,
        tenantId,
        tokenRecord: insertRes.rows[0],
      }),
      token_auto_created: false,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});
