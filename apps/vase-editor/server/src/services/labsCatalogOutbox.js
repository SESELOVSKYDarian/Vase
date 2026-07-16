import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { mapBusinessProductForLabs, nextCatalogRetryDelayMs } from './labsCatalogOutboxCore.js';

export { mapBusinessProductForLabs, nextCatalogRetryDelayMs } from './labsCatalogOutboxCore.js';

export async function ensureLabsCatalogOutboxSchema() {
  await pool.query(`create table if not exists labs_catalog_outbox (
    id uuid primary key, event_id text not null unique, tenant_id uuid not null,
    payload jsonb not null, status text not null default 'pending', attempts integer not null default 0,
    next_attempt_at timestamptz not null default now(), last_error text,
    created_at timestamptz not null default now(), delivered_at timestamptz
  )`);
  await pool.query('create index if not exists labs_catalog_outbox_pending_idx on labs_catalog_outbox(status, next_attempt_at)');
}

async function loadTenantCatalog(tenantId) {
  const result = await pool.query(`select id, erp_id, external_id, sku, name, description, price, stock,
    is_active_source, deleted_at, last_sync_at, updated_at,
    coalesce(data->>'image_url', data->>'imageUrl') as image_url
    from product_cache where tenant_id = $1 and status = 'active' order by name asc`, [tenantId]);
  return result.rows.map(mapBusinessProductForLabs);
}

export async function enqueueLabsCatalogSync(tenantId) {
  await ensureLabsCatalogOutboxSchema();
  const eventId = randomUUID();
  const products = await loadTenantCatalog(tenantId);
  const payload = { eventId, globalTenantId: tenantId, occurredAt: new Date().toISOString(), products };
  await pool.query('insert into labs_catalog_outbox (id, event_id, tenant_id, payload) values ($1, $2, $3, $4::jsonb)', [randomUUID(), eventId, tenantId, JSON.stringify(payload)]);
  return { eventId, productCount: products.length };
}

async function deliver(row) {
  const baseUrl = String(process.env.LABS_INTERNAL_URL || 'http://vase-labs:3007').replace(/\/$/, '');
  const serviceToken = String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim();
  if (!serviceToken) throw new Error('SERVICE_TO_SERVICE_TOKEN_NOT_CONFIGURED');
  const response = await fetch(`${baseUrl}/api/internal/business/catalog/sync`, {
    method: 'POST',
    headers: { authorization: `Bearer ${serviceToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(row.payload),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`LABS_CATALOG_SYNC_${response.status}`);
}

export async function processLabsCatalogOutbox({ limit = 10 } = {}) {
  await ensureLabsCatalogOutboxSchema();
  const result = await pool.query(`select id, payload, attempts from labs_catalog_outbox
    where status = 'pending' and next_attempt_at <= now() order by created_at asc limit $1`, [limit]);
  for (const row of result.rows) {
    try {
      await deliver(row);
      await pool.query("update labs_catalog_outbox set status = 'delivered', delivered_at = now(), last_error = null where id = $1", [row.id]);
    } catch (error) {
      const attempts = row.attempts + 1;
      await pool.query('update labs_catalog_outbox set attempts = $2, next_attempt_at = $3, last_error = $4 where id = $1', [row.id, attempts, new Date(Date.now() + nextCatalogRetryDelayMs(attempts)), String(error?.message || error).slice(0, 500)]);
    }
  }
  return result.rowCount;
}
