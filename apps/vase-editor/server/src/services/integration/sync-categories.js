// Crea o encuentra los rubros de un producto sincronizado.
import { UNDEFINED_CATEGORY_LABEL } from './constants.js';
import { normalizeCategoryToken } from './values.js';
import { resolvePiquimRootCategoryLabels, slugify, uniqueTextValues } from './category-tokens.js';
import { resolveCategoryIdsForSync } from './sync-db.js';

export async function ensureCategoryPathForSync(client, { tenantId, categoryPathLabels = [] }) {
  const normalizedPath = uniqueTextValues(
    (Array.isArray(categoryPathLabels) ? categoryPathLabels : []).map((value) => normalizeCategoryToken(value))
  );

  if (!normalizedPath.length) {
    return {
      categoryId: null,
      createdCount: 0,
    };
  }

  let parentId = null;
  let parentSlug = '';
  let currentId = null;
  let createdCount = 0;

  for (const label of normalizedPath) {
    const loweredLabel = label.toLowerCase();
    const baseLabelSlug = slugify(label) || `categoria-sync-${createdCount + 1}`;
    const findParams = parentId
      ? [tenantId, loweredLabel, baseLabelSlug, label, parentId]
      : [tenantId, loweredLabel, baseLabelSlug, label];
    const existingRes = await client.query(
      [
        'select id, slug from categories',
        'where tenant_id = $1',
        'and (lower(name) = $2 or slug = $3 or coalesce(erp_id, \'\') = $4)',
        parentId
          ? "and nullif(data->>'parent_id', '') = $5"
          : "and nullif(data->>'parent_id', '') is null",
        'limit 1',
      ].join(' '),
      findParams
    );

    if (existingRes.rowCount) {
      currentId = existingRes.rows[0].id;
      parentId = currentId;
      parentSlug = existingRes.rows[0].slug || baseLabelSlug;
      continue;
    }

    const baseSlug = slugify(parentSlug ? `${parentSlug}-${label}` : label) || baseLabelSlug;
    let candidateSlug = baseSlug;
    let createdRow = null;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const payloadData = parentId
        ? { parent_id: parentId, auto_created_by: 'integration_sync', source_category_label: label }
        : { auto_created_by: 'integration_sync', source_category_label: label };
      const insertRes = await client.query(
        [
          'insert into categories (tenant_id, name, slug, data)',
          'values ($1, $2, $3, $4::jsonb)',
          'on conflict do nothing',
          'returning id, slug',
        ].join(' '),
        [tenantId, label, candidateSlug, JSON.stringify(payloadData)]
      );

      if (insertRes.rowCount) {
        createdRow = insertRes.rows[0];
        createdCount += 1;
        break;
      }

      const existingBySlugRes = await client.query(
        'select id, slug from categories where tenant_id = $1 and slug = $2 limit 1',
        [tenantId, candidateSlug]
      );

      if (existingBySlugRes.rowCount) {
        createdRow = existingBySlugRes.rows[0];
        break;
      }

      candidateSlug = `${baseSlug}-${attempt + 2}`;
    }

    if (!createdRow?.id) {
      const error = new Error('category_path_resolution_failed');
      error.code = 'category_path_resolution_failed';
      throw error;
    }

    currentId = createdRow.id;
    parentId = createdRow.id;
    parentSlug = createdRow.slug || candidateSlug;
  }

  return {
    categoryId: currentId,
    createdCount,
  };
}

export async function resolveCategoryAssignmentForSync(client, {
  tenantId,
  item,
  existing = null,
  piquimTenant = false,
}) {
  const piquimRootCategoryLabels = piquimTenant ? resolvePiquimRootCategoryLabels(item) : [];
  const hasUsefulCategorySignal = Boolean(
    item?.hasCategoryRefs ||
    item?.hasCategoryPath ||
    (piquimTenant && piquimRootCategoryLabels.length)
  );
  const shouldAssignUndefinedCategory =
    item?.hasExplicitUndefinedCategory ||
    (!existing && !hasUsefulCategorySignal);

  if (shouldAssignUndefinedCategory) {
    const undefinedResolution = await resolveCategoryIdsForSync(client, {
      tenantId,
      categoryIds: [],
      categoryLabels: [UNDEFINED_CATEGORY_LABEL],
    });

    return {
      categoryIds: undefinedResolution.categoryIds,
      createdCount: undefinedResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'undefined',
    };
  }

  if (piquimTenant) {
    if (piquimRootCategoryLabels.length) {
      const flatResolution = await resolveCategoryIdsForSync(client, {
        tenantId,
        categoryIds: [],
        categoryLabels: piquimRootCategoryLabels,
      });

      return {
        categoryIds: flatResolution.categoryIds,
        createdCount: flatResolution.createdCount,
        shouldReplaceCategories: true,
        source: 'piquim_root',
      };
    }

    if (item?.hasCategoryRefs) {
      const flatResolution = await resolveCategoryIdsForSync(client, {
        tenantId,
        categoryIds: item.categoryIds,
        categoryLabels: item.categoryLabels,
      });

      return {
        categoryIds: flatResolution.categoryIds,
        createdCount: flatResolution.createdCount,
        shouldReplaceCategories: true,
        source: 'flat',
      };
    }
  }

  if (item?.hasCategoryPath && item.categoryPathLabels.length > 1) {
    const categoryPathResolution = await ensureCategoryPathForSync(client, {
      tenantId,
      categoryPathLabels: item.categoryPathLabels,
    });

    return {
      categoryIds: categoryPathResolution.categoryId ? [categoryPathResolution.categoryId] : [],
      createdCount: categoryPathResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'path',
    };
  }

  if (item?.hasCategoryRefs) {
    const flatResolution = await resolveCategoryIdsForSync(client, {
      tenantId,
      categoryIds: item.categoryIds,
      categoryLabels: item.categoryLabels,
    });

    return {
      categoryIds: flatResolution.categoryIds,
      createdCount: flatResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'flat',
    };
  }

  if (item?.hasCategoryPath) {
    const flatResolution = await resolveCategoryIdsForSync(client, {
      tenantId,
      categoryIds: [],
      categoryLabels: item.categoryPathLabels,
    });

    return {
      categoryIds: flatResolution.categoryIds,
      createdCount: flatResolution.createdCount,
      shouldReplaceCategories: true,
      source: 'single_path',
    };
  }

  return {
    categoryIds: [],
    createdCount: 0,
    shouldReplaceCategories: false,
    source: 'preserve',
  };
}

export const mapSyncItemError = (err) => {
  const errorCode = String(err?.code || '').trim();

  if (errorCode === 'invalid_value_format') {
    return {
      error: 'invalid_value_format',
      ...(err?.detail ? { error_detail: err.detail } : {}),
      ...(err?.field ? { error_field: err.field } : {}),
      ...(err?.raw_value !== undefined ? { error_value: err.raw_value } : {}),
    };
  }

  if (!errorCode && err?.message) {
    return { error: err.message };
  }

  if (errorCode === '22P02') {
    return {
      error: 'invalid_value_format',
      error_detail: 'Revisar formatos numericos o identificadores del item enviado.',
    };
  }

  if (errorCode === '23502') {
    return {
      error: 'required_value_missing',
      error_detail: 'Falta un dato requerido para persistir el item.',
    };
  }

  return { error: errorCode || err?.message || 'sync_item_failed' };
};
