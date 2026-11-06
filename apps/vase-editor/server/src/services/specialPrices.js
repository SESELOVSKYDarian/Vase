import { pool } from '../db.js';
import { ensurePricingSchema } from './userPricing.js';

// Precio especial: un precio fijo por producto para los clientes de una lista o para clientes puntuales.
// Queda guardado tal cual: si el sistema de gestión cambia el precio del producto, este no se mueve.
const NO_ID = '00000000-0000-0000-0000-000000000000';
let schemaReady = false;
let schemaPromise = null;

export async function ensureSpecialPricesSchema() {
  if (schemaReady) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await ensurePricingSchema();
      await pool.query(
        [
          'create table if not exists tenant_special_prices (',
          'id uuid primary key default gen_random_uuid(),',
          'tenant_id uuid not null references tenants(id) on delete cascade,',
          'product_id uuid not null references product_cache(id) on delete cascade,',
          'price_list_id uuid references price_lists(id) on delete cascade,',
          'user_id uuid references users(id) on delete cascade,',
          'price numeric(12,2) not null,',
          'batch_id uuid not null,',
          "batch_name text not null default '',",
          'created_at timestamptz not null default now(),',
          'check (price_list_id is not null or user_id is not null)',
          ')',
        ].join(' ')
      );
      await pool.query(
        [
          'create unique index if not exists tenant_special_prices_target_idx on tenant_special_prices',
          `(tenant_id, product_id, (coalesce(price_list_id, '${NO_ID}'::uuid)), (coalesce(user_id, '${NO_ID}'::uuid)))`,
        ].join(' ')
      );
      await pool.query('create index if not exists tenant_special_prices_batch_idx on tenant_special_prices(tenant_id, batch_id)');
      schemaReady = true;
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  await schemaPromise;
}

// Los precios especiales que le tocan a un cliente: el puesto a él gana al de su lista.
export function pickSpecialPrices(rows = [], { userId = null, priceListId = null } = {}) {
  const byList = new Map();
  const byUser = new Map();
  rows.forEach((row) => {
    const price = Number(row.price);
    if (!Number.isFinite(price)) return;
    if (userId && row.user_id === userId) byUser.set(row.product_id, price);
    else if (priceListId && row.price_list_id === priceListId && !row.user_id) byList.set(row.product_id, price);
  });
  return new Map([...byList, ...byUser]);
}

export async function loadSpecialPrices({ tenantId, userId = null, priceListId = null }) {
  if (!tenantId || (!userId && !priceListId)) return new Map();
  try {
    await ensureSpecialPricesSchema();
    const result = await pool.query(
      [
        'select product_id, price_list_id, user_id, price from tenant_special_prices',
        'where tenant_id = $1 and (user_id = $2 or (user_id is null and price_list_id = $3))',
      ].join(' '),
      [tenantId, userId, priceListId]
    );
    return pickSpecialPrices(result.rows, { userId, priceListId });
  } catch (err) {
    console.warn('Special prices unavailable:', err?.message || err);
    return new Map();
  }
}

export async function upsertSpecialPrices(client, { tenantId, batchId, batchName, rows }) {
  if (!rows.length) return 0;
  await client.query(
    [
      'insert into tenant_special_prices (tenant_id, product_id, price_list_id, user_id, price, batch_id, batch_name)',
      'select $1, v.product_id, v.price_list_id, v.user_id, v.price, $2, $3',
      'from unnest($4::uuid[], $5::uuid[], $6::uuid[], $7::numeric[]) as v(product_id, price_list_id, user_id, price)',
      `on conflict (tenant_id, product_id, (coalesce(price_list_id, '${NO_ID}'::uuid)), (coalesce(user_id, '${NO_ID}'::uuid)))`,
      'do update set price = excluded.price, batch_id = excluded.batch_id, batch_name = excluded.batch_name, created_at = now()',
    ].join(' '),
    [
      tenantId,
      batchId,
      batchName,
      rows.map((row) => row.product_id),
      rows.map((row) => row.price_list_id || null),
      rows.map((row) => row.user_id || null),
      rows.map((row) => row.price),
    ]
  );
  return rows.length;
}
