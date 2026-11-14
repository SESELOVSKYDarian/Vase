// Productos: cómo se arma un producto para el panel y cómo se guardan los datos del comercio.
import { pool } from '../../db.js';
import { applyPriceTierLabels, normalizePriceTierLabels } from '../../services/priceTierLabels.js';

// productos que esa ruta puede servir reciben las imagenes como rutas cortas; el resto sigue igual.
export const PUBLIC_IMAGE_ROUTE_VISIBLE_SQL = [
  "p.status = 'active'",
  'and p.deleted_at is null',
  'and coalesce(p.is_active_source, true) = true',
  'and coalesce(p.is_visible_web, true) = true',
  'and (o.hidden is null or o.hidden = false)',
].join(' ');


export function normalizeStoredPriceTiers(data, priceRetail, priceWholesale) {
  const raw = data?.price_tiers && typeof data.price_tiers === 'object' ? data.price_tiers : {};
  const tiers = [];

  for (let slot = 1; slot <= 10; slot += 1) {
    const key = `price_${slot}`;
    const parsed = Number(raw[key]);
    if (Number.isFinite(parsed)) {
      tiers.push({ slot, key, value: parsed });
    }
  }

  if (!tiers.some((entry) => entry.slot === 1) && Number.isFinite(Number(priceRetail))) {
    tiers.unshift({ slot: 1, key: 'price_1', value: Number(priceRetail) });
  }

  if (!tiers.some((entry) => entry.slot === 2) && Number.isFinite(Number(priceWholesale)) && Number(priceWholesale) > 0) {
    tiers.push({ slot: 2, key: 'price_2', value: Number(priceWholesale) });
  }

  return tiers
    .sort((a, b) => a.slot - b.slot)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.slot === entry.slot) === index);
}

export function mapTenantProductRecord(row, priceTierLabels = {}) {
  const data = row?.data && typeof row.data === 'object' ? row.data : {};
  const categoryIds = Array.isArray(row?.category_ids) ? row.category_ids : [];
  const fallbackDescription =
    data.long_description ||
    data.longDescription ||
    row?.description ||
    row?.name ||
    null;

  return {
    ...row,
    short_description:
      data.short_description ||
      data.shortDescription ||
      fallbackDescription,
    long_description:
      data.long_description ||
      data.longDescription ||
      fallbackDescription,
    price_tiers: applyPriceTierLabels(
      normalizeStoredPriceTiers(data, row?.price, row?.price_wholesale),
      priceTierLabels
    ),
    category_id: categoryIds[0] || '',
    category_ids: categoryIds,
    source_category: data.source_category || null,
    source_category_path: Array.isArray(data.source_category_path) ? data.source_category_path : [],
  };
}

export async function loadTenantPriceTierLabels(db, tenantId) {
  const result = await db.query(
    'select commerce from tenant_settings where tenant_id = $1',
    [tenantId]
  );
  return normalizePriceTierLabels(result.rows[0]?.commerce?.price_tier_labels);
}

export async function fetchTenantProductRow(db, tenantId, productId, priceTierLabels = null) {
  const result = await db.query(
    [
      [
        'select p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.description, p.price, p.price_wholesale, p.stock, p.brand, p.data,',
        "(o.featured = true) as is_featured,",
        "case when o.hidden = true then false else coalesce(p.is_visible_web, true) end as is_visible_web,",
        'coalesce(p.admin_locked, false) as admin_locked,',
        'coalesce(p.is_active_source, true) as is_active_source,',
        'p.deleted_at, p.last_sync_at,',
        "case when p.external_id is null then 'manual' when p.deleted_at is not null then 'deleted' when coalesce(p.is_active_source, true) = false then 'source_inactive' else 'synced' end as sync_status,",
        "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids",
      ].join(' '),
      'from product_cache p',
      'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
      'where p.tenant_id = $1 and p.id = $2',
    ].join(' '),
    [tenantId, productId]
  );

  if (!result.rows[0]) return null;
  const labels = priceTierLabels || await loadTenantPriceTierLabels(db, tenantId);
  return mapTenantProductRecord(result.rows[0], labels);
}

export async function upsertTenantCommerce(tenantId, commerce) {
  const existing = await pool.query(
    'select tenant_id from tenant_settings where tenant_id = $1',
    [tenantId]
  );

  if (!existing.rowCount) {
    await pool.query(
      'insert into tenant_settings (tenant_id, branding, theme, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb)',
      [tenantId, {}, {}, commerce || {}]
    );
    return;
  }

  await pool.query(
    [
      'update tenant_settings',
      'set commerce = $2::jsonb,',
      'updated_at = now()',
      'where tenant_id = $1',
    ].join(' '),
    [tenantId, commerce || {}]
  );
}
