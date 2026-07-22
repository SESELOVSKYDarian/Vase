import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { mapBusinessProductForLabs, nextCatalogRetryDelayMs } from './labsCatalogOutboxCore.js';
import { buildBusinessCatalogSnapshot } from './businessCatalogSnapshot.js';

export { mapBusinessProductForLabs, nextCatalogRetryDelayMs } from './labsCatalogOutboxCore.js';

export async function ensureLabsCatalogOutboxSchema(db = pool) {
  await db.query(`create table if not exists labs_catalog_outbox (
    id uuid primary key, event_id text not null unique, tenant_id uuid not null,
    payload jsonb not null, status text not null default 'pending', attempts integer not null default 0,
    next_attempt_at timestamptz not null default now(), last_error text,
    created_at timestamptz not null default now(), delivered_at timestamptz
  )`);
  await db.query('create index if not exists labs_catalog_outbox_pending_idx on labs_catalog_outbox(status, next_attempt_at)');
}

export async function enqueueLabsCatalogSync(tenantReference, {
  db = pool,
  createId = randomUUID,
  now = () => new Date(),
} = {}) {
  await ensureLabsCatalogOutboxSchema(db);
  const { tenant, payload } = await buildBusinessCatalogSnapshot({
    db,
    tenantReference,
    createEventId: createId,
    now,
  });
  await db.query('insert into labs_catalog_outbox (id, event_id, tenant_id, payload) values ($1, $2, $3, $4::jsonb)', [createId(), payload.eventId, tenant.businessTenantId, JSON.stringify(payload)]);
  return { eventId: payload.eventId, productCount: payload.products.length };
}

async function deliver(row) {
  const baseUrl = String(process.env.LABS_INTERNAL_URL || 'http://vase-labs:3007').replace(/\/$/, '');
  const serviceToken = String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim();
  if (!serviceToken) throw new Error('SERVICE_TO_SERVICE_TOKEN_NOT_CONFIGURED');
  const response = await fetch(`${baseUrl}/api/internal/business/catalog/sync`, {
    method: 'POST',
    headers: { authorization: `Bearer ${serviceToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(row.payload),
    signal: AbortSignal.timeout(75_000),
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
