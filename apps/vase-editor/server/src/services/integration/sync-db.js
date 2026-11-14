// Guarda en la base los datos de sincronización y los rubros de un producto.
import { isUuid, toTextOrNull } from './values.js';
import { slugify } from './category-tokens.js';

export async function upsertSyncMetadata(client, { tenantId, productId, externalId, sourceSystem, lastSyncAt, rawPayload }) {
  await client.query(
    [
      'insert into product_sync_metadata (tenant_id, product_id, external_id, source_system, last_sync_at, raw_payload, updated_at)',
      'values ($1, $2, $3, $4, $5, $6::jsonb, now())',
      'on conflict (tenant_id, external_id)',
      'do update set',
      'product_id = excluded.product_id,',
      'source_system = excluded.source_system,',
      'last_sync_at = excluded.last_sync_at,',
      'raw_payload = excluded.raw_payload,',
      'updated_at = now()',
    ].join(' '),
    [tenantId, productId, externalId, sourceSystem, lastSyncAt, JSON.stringify(rawPayload || {})]
  );
}

export async function replaceProductCategories(client, { tenantId, productId, categoryIds }) {
  const selectedCategoryIds = Array.isArray(categoryIds)
    ? [...new Set(categoryIds.filter((value) => isUuid(value)))]
    : [];

  if (selectedCategoryIds.length) {
    const validCategoriesRes = await client.query(
      'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
      [tenantId, selectedCategoryIds]
    );

    if (validCategoriesRes.rowCount !== selectedCategoryIds.length) {
      const error = new Error('invalid_category_ids');
      error.status = 400;
      error.code = 'invalid_category_ids';
      throw error;
    }
  }

  await client.query('delete from product_categories where product_id = $1', [productId]);

  if (selectedCategoryIds.length) {
    await client.query(
      [
        'insert into product_categories (product_id, category_id)',
        'select $1, unnest($2::uuid[])',
        'on conflict do nothing',
      ].join(' '),
      [productId, selectedCategoryIds]
    );
  }
}

export async function resolveCategoryIdsForSync(client, { tenantId, categoryIds = [], categoryLabels = [] }) {
  const normalizedIds = [...new Set((Array.isArray(categoryIds) ? categoryIds : []).filter((value) => isUuid(value)))];
  const normalizedLabels = [...new Set((Array.isArray(categoryLabels) ? categoryLabels : []).map((value) => toTextOrNull(value)).filter(Boolean))];

  if (normalizedIds.length) {
    const validCategoriesRes = await client.query(
      'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
      [tenantId, normalizedIds]
    );

    if (validCategoriesRes.rowCount !== normalizedIds.length) {
      const error = new Error('invalid_category_ids');
      error.status = 400;
      error.code = 'invalid_category_ids';
      throw error;
    }
  }

  if (!normalizedLabels.length) {
    return {
      categoryIds: normalizedIds,
      createdCount: 0,
    };
  }

  const loweredLabels = normalizedLabels.map((value) => value.toLowerCase());
  const slugs = normalizedLabels.map((value) => slugify(value)).filter(Boolean);
  const existingRes = await client.query(
    [
      'select id, name, slug, erp_id',
      'from categories',
      'where tenant_id = $1',
      'and (lower(name) = any($2::text[]) or slug = any($3::text[]) or coalesce(erp_id, \'\') = any($4::text[]))',
    ].join(' '),
    [tenantId, loweredLabels, slugs, normalizedLabels]
  );

  const matches = new Map();
  existingRes.rows.forEach((row) => {
    const nameKey = String(row.name || '').trim().toLowerCase();
    const slugKey = String(row.slug || '').trim();
    const erpKey = String(row.erp_id || '').trim();
    if (nameKey) matches.set(nameKey, row.id);
    if (slugKey) matches.set(slugKey, row.id);
    if (erpKey) matches.set(erpKey, row.id);
  });

  const resolvedIds = [...normalizedIds];
  let createdCount = 0;

  for (const label of normalizedLabels) {
    const labelKey = label.toLowerCase();
    const labelSlug = slugify(label);
    const existingId = matches.get(labelKey) || matches.get(labelSlug) || matches.get(label);
    if (existingId) {
      resolvedIds.push(existingId);
      continue;
    }

    const baseSlug = labelSlug || `categoria-sync-${createdCount + 1}`;
    let candidateSlug = baseSlug;
    let createdId = null;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const insertRes = await client.query(
        [
          'insert into categories (tenant_id, name, slug, data)',
          'values ($1, $2, $3, $4::jsonb)',
          'on conflict do nothing',
          'returning id',
        ].join(' '),
        [
          tenantId,
          label,
          candidateSlug,
          JSON.stringify({ auto_created_by: 'integration_sync', source_category_label: label }),
        ]
      );

      if (insertRes.rowCount) {
        createdId = insertRes.rows[0].id;
        createdCount += 1;
        break;
      }

      const existingBySlugRes = await client.query(
        'select id from categories where tenant_id = $1 and slug = $2 limit 1',
        [tenantId, candidateSlug]
      );

      if (existingBySlugRes.rowCount) {
        createdId = existingBySlugRes.rows[0].id;
        break;
      }

      candidateSlug = `${baseSlug}-${attempt + 2}`;
    }

    if (createdId) {
      resolvedIds.push(createdId);
      matches.set(labelKey, createdId);
      if (labelSlug) matches.set(labelSlug, createdId);
      matches.set(label, createdId);
    }
  }

  return {
    categoryIds: [...new Set(resolvedIds)],
    createdCount,
  };
}
