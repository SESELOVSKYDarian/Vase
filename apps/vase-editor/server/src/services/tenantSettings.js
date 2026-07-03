import { pool } from '../db.js';

let seoColumnReady = false;

export async function ensureTenantSettingsSeoColumn() {
  if (seoColumnReady) {
    return;
  }

  await pool.query(
    [
      'ALTER TABLE tenant_settings',
      "ADD COLUMN IF NOT EXISTS seo jsonb NOT NULL DEFAULT '{}'::jsonb",
    ].join(' ')
  );

  seoColumnReady = true;
}

export async function queryTenantSettingsWithSeo(tenantId) {
  try {
    return await pool.query(
      'select branding, theme, seo, commerce from tenant_settings where tenant_id = $1',
      [tenantId]
    );
  } catch (err) {
    if (err?.code === '42703') {
      seoColumnReady = false;
      await ensureTenantSettingsSeoColumn();
      return pool.query(
        'select branding, theme, seo, commerce from tenant_settings where tenant_id = $1',
        [tenantId]
      );
    }
    throw err;
  }
}

