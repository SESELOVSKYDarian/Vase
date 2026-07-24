import { randomUUID } from 'node:crypto';
import { mapBusinessProductForLabs } from './labsCatalogOutboxCore.js';
import { findLatestProductSyncToken } from './productSyncCredentials.js';

const resolveCatalogImageBaseUrl = () => (
  process.env.INTEGRATIONS_PUBLIC_BASE_URL
  || process.env.PUBLIC_API_URL
  || process.env.API_PUBLIC_URL
  || process.env.PUBLIC_EDITOR_HOST
  || process.env.PUBLIC_STOREFRONT_HOST
  || ''
);

export async function resolveBusinessCatalogTenant(db, tenantReference) {
  const result = await db.query(
    [
      'select id, external_tenant_id',
      'from tenants',
      "where external_source = 'vase'",
      'and (id::text = $1 or external_tenant_id = $1)',
      'limit 1',
    ].join(' '),
    [tenantReference]
  );
  const row = result.rows[0];
  if (!row?.id || !row?.external_tenant_id) return null;
  return {
    businessTenantId: String(row.id),
    globalTenantId: String(row.external_tenant_id),
  };
}

export async function loadBusinessTenantCatalog(db, businessTenantId, options = {}) {
  const result = await db.query(`select id, erp_id, external_id, sku, name, description, price, stock,
    is_active_source, deleted_at, last_sync_at, updated_at,
    jsonb_build_object(
      'image_url', data->'image_url',
      'imageUrl', data->'imageUrl',
      'image', data->'image',
      'images', data->'images'
    ) as data
    from product_cache where tenant_id = $1 and status = 'active' order by name asc`, [businessTenantId]);
  const baseUrl = options.imageBaseUrl ?? resolveCatalogImageBaseUrl();
  return result.rows.map((product) => mapBusinessProductForLabs(product, { baseUrl }));
}

export async function buildBusinessCatalogSnapshot({
  db,
  tenantReference,
  createEventId = randomUUID,
  now = () => new Date(),
  requireCredential = false,
  findCredential = findLatestProductSyncToken,
}) {
  const tenant = await resolveBusinessCatalogTenant(db, tenantReference);
  if (!tenant) {
    const error = new Error('EXTERNAL_MANAGEMENT_NOT_CONNECTED');
    error.code = 'EXTERNAL_MANAGEMENT_NOT_CONNECTED';
    throw error;
  }
  if (requireCredential && !await findCredential(db, tenant.businessTenantId)) {
    const error = new Error('EXTERNAL_MANAGEMENT_NOT_CONNECTED');
    error.code = 'EXTERNAL_MANAGEMENT_NOT_CONNECTED';
    throw error;
  }
  const products = await loadBusinessTenantCatalog(db, tenant.businessTenantId);
  return {
    tenant,
    payload: {
      eventId: createEventId(),
      globalTenantId: tenant.globalTenantId,
      occurredAt: now().toISOString(),
      products,
    },
  };
}

export function createBusinessCatalogSnapshotHandler({
  db,
  expectedServiceToken,
  findCredential = findLatestProductSyncToken,
}) {
  return async function businessCatalogSnapshotHandler(req, res, next) {
    const expected = String(expectedServiceToken || '').trim();
    if (!expected || req.get('authorization') !== `Bearer ${expected}`) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const tenantReference = String(req.params?.tenantId || '').trim();
    if (!tenantReference) return res.status(400).json({ error: 'invalid_tenant_id' });
    try {
      const snapshot = await buildBusinessCatalogSnapshot({
        db,
        tenantReference,
        requireCredential: true,
        findCredential,
      });
      return res.json(snapshot.payload);
    } catch (error) {
      if (error?.code === 'EXTERNAL_MANAGEMENT_NOT_CONNECTED') {
        return res.status(404).json({ error: 'EXTERNAL_MANAGEMENT_NOT_CONNECTED' });
      }
      return next(error);
    }
  };
}
