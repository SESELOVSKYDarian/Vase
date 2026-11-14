// Prepara las tablas y columnas que necesita la sincronización (una sola vez).
import { pool } from '../../db.js';

export let productSyncSchemaReady = false;
export let productSyncSchemaPromise = null;


export async function ensureProductSyncSchema() {
  if (productSyncSchemaReady) return;

  if (!productSyncSchemaPromise) {
    productSyncSchemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS external_id varchar');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS source_system varchar');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS is_active_source boolean NOT NULL DEFAULT true');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS is_visible_web boolean NOT NULL DEFAULT true');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS admin_locked boolean NOT NULL DEFAULT false');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS deleted_at timestamptz');
        await client.query('ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS last_sync_at timestamptz');

        await client.query(
          [
            'CREATE TABLE IF NOT EXISTS product_sync_metadata (',
            'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
            'product_id uuid NOT NULL REFERENCES product_cache(id) ON DELETE CASCADE,',
            'tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,',
            'external_id varchar NOT NULL,',
            'source_system varchar NOT NULL,',
            'last_sync_at timestamptz NULL,',
            "raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,",
            'created_at timestamptz NOT NULL DEFAULT now(),',
            'updated_at timestamptz NOT NULL DEFAULT now()',
            ')',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE UNIQUE INDEX IF NOT EXISTS product_sync_metadata_tenant_external_id_uidx',
            'ON product_sync_metadata(tenant_id, external_id)',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE UNIQUE INDEX IF NOT EXISTS product_cache_tenant_external_id_uidx',
            'ON product_cache(tenant_id, external_id)',
            'WHERE external_id IS NOT NULL',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE INDEX IF NOT EXISTS product_cache_tenant_visibility_sync_idx',
            'ON product_cache(tenant_id, status, is_active_source, is_visible_web, deleted_at)',
          ].join(' ')
        );

        await client.query(
          [
            'CREATE INDEX IF NOT EXISTS product_sync_metadata_tenant_last_sync_idx',
            'ON product_sync_metadata(tenant_id, last_sync_at DESC)',
          ].join(' ')
        );

        productSyncSchemaReady = true;
      } finally {
        client.release();
      }
    })().catch((err) => {
      productSyncSchemaPromise = null;
      throw err;
    });
  }

  await productSyncSchemaPromise;
}
