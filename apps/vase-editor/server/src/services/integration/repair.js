// Reparación de rubros de productos ya sincronizados.
import { pool } from '../../db.js';
import { CATEGORY_PATH_ALIASES, DEFAULT_SOURCE_SYSTEM, UNDEFINED_CATEGORY_LABEL } from './constants.js';
import { firstTextAlias, hasOwn, isPlainObject, isUndefinedLikeText, isUuid, toTextOrNull } from './values.js';
import { isPiquimTenant } from './category-tokens.js';
import { normalizeSyncItem } from './sync-item.js';
import { replaceProductCategories, resolveCategoryIdsForSync } from './sync-db.js';
import { resolveCategoryAssignmentForSync } from './sync-categories.js';
import { ensureProductSyncSchema } from './sync-schema.js';

export const normalizeCategoryNameList = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => toTextOrNull(entry))
    .filter(Boolean);

export const normalizeCategoryIdList = (value) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

export const hasOnlyUndefinedCategories = (categoryNames = []) => {
  const names = normalizeCategoryNameList(categoryNames);
  return names.length > 0 && names.every((name) => isUndefinedLikeText(name));
};

export const productNeedsCategoryRepair = (row) => {
  const categoryIds = normalizeCategoryIdList(row?.category_ids);
  const categoryNames = normalizeCategoryNameList(row?.category_names);
  return categoryIds.length === 0 || hasOnlyUndefinedCategories(categoryNames);
};

export const buildRepairRawPayload = (row) => {
  const data = isPlainObject(row?.data) ? row.data : {};
  const rawPayload = isPlainObject(row?.raw_payload) ? { ...row.raw_payload } : {};
  const sourcePath = Array.isArray(data.source_category_path)
    ? data.source_category_path.map((value) => toTextOrNull(value)).filter(Boolean)
    : [];
  const hasPayloadPath = CATEGORY_PATH_ALIASES.some((key) => hasOwn(rawPayload, key));

  if (sourcePath.length && !hasPayloadPath) {
    rawPayload.category_path = sourcePath;
  }

  if (!firstTextAlias(rawPayload, ['external_id', 'externalId', 'id', 'sku', 'codigo', 'codigo_propio'])) {
    rawPayload.external_id = row.external_id || row.erp_id || row.sku || row.id;
  }
  if (!firstTextAlias(rawPayload, ['sku', 'codigo', 'codigo_propio', 'codigo_producto', 'product_code']) && row.sku) {
    rawPayload.sku = row.sku;
  }
  if (!firstTextAlias(rawPayload, ['name', 'title', 'titulo', 'detalle_ampliado', 'detalleAmpliado', 'product_name']) && row.name) {
    rawPayload.name = row.name;
  }
  if (!firstTextAlias(rawPayload, ['source_system', 'sourceSystem', 'origin']) && row.source_system) {
    rawPayload.source_system = row.source_system;
  }

  return rawPayload;
};

export async function repairSyncedProductCategories({
  tenantId,
  apply = false,
  filters = {},
} = {}) {
  await ensureProductSyncSchema();

  const normalizedTenantId = String(tenantId || '').trim();
  if (!isUuid(normalizedTenantId)) {
    const error = new Error('invalid_tenant_id');
    error.code = 'invalid_tenant_id';
    throw error;
  }

  const params = [normalizedTenantId];
  const where = [
    'p.tenant_id = $1',
    '(p.external_id is not null or p.erp_id is not null or p.source_system is not null or m.id is not null)',
  ];

  const sku = toTextOrNull(filters.sku);
  if (sku) {
    params.push(sku);
    where.push(`p.sku = $${params.length}`);
  }

  const externalId = toTextOrNull(filters.externalId);
  if (externalId) {
    params.push(externalId);
    where.push(`(p.external_id = $${params.length} or p.erp_id = $${params.length} or m.external_id = $${params.length})`);
  }

  const query = toTextOrNull(filters.query);
  if (query) {
    params.push(`%${query}%`);
    where.push([
      `(p.name ilike $${params.length}`,
      `or p.sku ilike $${params.length}`,
      `or p.erp_id ilike $${params.length}`,
      `or p.external_id ilike $${params.length})`,
    ].join(' '));
  }

  const limit = Number(filters.limit || 0);
  const hasLimit = Number.isInteger(limit) && limit > 0;
  if (hasLimit) {
    params.push(limit);
  }

  const client = await pool.connect();
  const results = [];
  let scanned = 0;
  let repaired = 0;
  let skipped = 0;
  let categoriesCreated = 0;

  try {
    await client.query('BEGIN');

    const productsRes = await client.query(
      [
        'select p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.data,',
        'm.raw_payload,',
        "coalesce(array_agg(distinct pc.category_id) filter (where pc.category_id is not null), '{}'::uuid[]) as category_ids,",
        "coalesce(array_agg(distinct c.name) filter (where c.name is not null), '{}'::text[]) as category_names",
        'from product_cache p',
        [
          'left join lateral (',
          'select metadata.id, metadata.external_id, metadata.raw_payload',
          'from product_sync_metadata metadata',
          'where metadata.product_id = p.id and metadata.tenant_id = p.tenant_id',
          'order by metadata.last_sync_at desc nulls last, metadata.updated_at desc',
          'limit 1',
          ') m on true',
        ].join(' '),
        'left join product_categories pc on pc.product_id = p.id',
        'left join categories c on c.id = pc.category_id and c.tenant_id = p.tenant_id',
        `where ${where.join(' and ')}`,
        'group by p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.data, m.raw_payload',
        'order by p.name asc',
        hasLimit ? `limit $${params.length}` : '',
      ].filter(Boolean).join(' '),
      params
    );

    for (const row of productsRes.rows) {
      scanned += 1;

      if (!productNeedsCategoryRepair(row)) {
        skipped += 1;
        continue;
      }

      const rawPayload = buildRepairRawPayload(row);
      const item = normalizeSyncItem(rawPayload, row.source_system || DEFAULT_SOURCE_SYSTEM);
      const hasUsefulSourceCategory = item.hasCategoryRefs || item.hasCategoryPath || item.hasExplicitUndefinedCategory;

      let categoryResolution = null;
      if (hasUsefulSourceCategory) {
        categoryResolution = await resolveCategoryAssignmentForSync(client, {
          tenantId: normalizedTenantId,
          item,
          existing: { id: row.id },
          piquimTenant: isPiquimTenant(normalizedTenantId),
        });
      } else if (!normalizeCategoryIdList(row.category_ids).length) {
        const fallbackResolution = await resolveCategoryIdsForSync(client, {
          tenantId: normalizedTenantId,
          categoryIds: [],
          categoryLabels: [UNDEFINED_CATEGORY_LABEL],
        });
        categoryResolution = {
          categoryIds: fallbackResolution.categoryIds,
          createdCount: fallbackResolution.createdCount,
          shouldReplaceCategories: true,
          source: 'missing_fallback',
        };
      }

      if (!categoryResolution?.shouldReplaceCategories) {
        skipped += 1;
        results.push({
          product_id: row.id,
          sku: row.sku,
          name: row.name,
          status: 'skipped',
          reason: 'no_source_category',
          current_categories: normalizeCategoryNameList(row.category_names),
          source_category_path: item.categoryPathLabels || [],
        });
        continue;
      }

      await replaceProductCategories(client, {
        tenantId: normalizedTenantId,
        productId: row.id,
        categoryIds: categoryResolution.categoryIds,
      });

      repaired += 1;
      categoriesCreated += Number(categoryResolution.createdCount || 0);
      results.push({
        product_id: row.id,
        sku: row.sku,
        external_id: row.external_id || row.erp_id || null,
        name: row.name,
        status: apply ? 'repaired' : 'would_repair',
        current_categories: normalizeCategoryNameList(row.category_names),
        next_category_ids: categoryResolution.categoryIds,
        source_category_path: item.categoryPathLabels || [],
        source: categoryResolution.source,
        categories_created: categoryResolution.createdCount,
      });
    }

    if (apply) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }

    return {
      ok: true,
      mode: apply ? 'apply' : 'dry-run',
      tenant_id: normalizedTenantId,
      scanned,
      repaired,
      skipped,
      categories_created: categoriesCreated,
      items: results,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
