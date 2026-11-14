// Sincroniza una tanda de productos recibidos del sistema de gestión.
import { pool } from '../../db.js';
import { DEFAULT_SOURCE_SYSTEM } from './constants.js';
import { isPlainObject, toTextOrNull } from './values.js';
import { isPiquimTenant } from './category-tokens.js';
import { buildProductDataFromSync, buildSyncItemResultBase, normalizeSyncItem } from './sync-item.js';
import { replaceProductCategories, upsertSyncMetadata } from './sync-db.js';
import { mapSyncItemError, resolveCategoryAssignmentForSync } from './sync-categories.js';
import { ensureProductSyncSchema } from './sync-schema.js';

export async function syncIntegrationProducts({
  tenantId,
  items,
  sourceSystem = DEFAULT_SOURCE_SYSTEM,
}) {
  await ensureProductSyncSchema();

  const sourceItems = Array.isArray(items) ? items : [];
  if (!sourceItems.length) {
    return {
      ok: true,
      tenant_id: tenantId,
      source_system: sourceSystem,
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      categories_created: 0,
      item_results: [],
    };
  }

  const normalizedEntries = sourceItems.map((rawItem, index) => {
    if (!isPlainObject(rawItem)) {
      return { index, rawItem, item: null };
    }

    return {
      index,
      rawItem,
      item: normalizeSyncItem({
        ...rawItem,
        source_system: rawItem?.source_system ?? rawItem?.sourceSystem ?? sourceSystem,
      }),
    };
  });

  const externalIds = [...new Set(
    normalizedEntries
      .map((entry) => entry.item?.externalId)
      .map((value) => toTextOrNull(value))
      .filter(Boolean)
  )];
  const piquimTenant = isPiquimTenant(tenantId);
  const skus = [...new Set(
    normalizedEntries
      .map((entry) => entry.item?.sku)
      .map((value) => toTextOrNull(value))
      .filter(Boolean)
  )];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingParams = [tenantId, externalIds];
    const existingSkuFilter = piquimTenant && skus.length
      ? `or p.sku = any($${existingParams.push(skus)}::varchar[])`
      : '';
    const existingRes = await client.query(
      [
        'select p.id, p.erp_id, p.external_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.stock, p.brand,',
        'p.data, p.status, p.admin_locked, p.deleted_at, p.is_active_source,',
        'm.external_id as metadata_external_id',
        'from product_cache p',
        'left join product_sync_metadata m on m.product_id = p.id and m.tenant_id = p.tenant_id',
        'where p.tenant_id = $1',
        `and (p.external_id = any($2::varchar[]) or p.erp_id = any($2::varchar[]) or m.external_id = any($2::varchar[]) ${existingSkuFilter})`,
      ].join(' '),
      existingParams
    );

    const existingByExternalId = new Map();
    const existingBySku = new Map();
    for (const row of existingRes.rows) {
      [row.external_id, row.erp_id, row.metadata_external_id]
        .map((value) => toTextOrNull(value))
        .filter(Boolean)
        .forEach((key) => {
          if (!existingByExternalId.has(key)) {
            existingByExternalId.set(key, row);
          }
        });
      const skuKey = toTextOrNull(row.sku);
      if (skuKey && !existingBySku.has(skuKey)) {
        existingBySku.set(skuKey, row);
      }
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    let categoriesCreated = 0;
    const syncedAt = new Date();
    const itemResults = [];

    for (const entry of normalizedEntries) {
      const { index, rawItem, item } = entry;
      const baseResult = buildSyncItemResultBase({
        index,
        rawItem: isPlainObject(rawItem) ? rawItem : {},
        item,
        sourceSystem,
      });

      if (!isPlainObject(rawItem)) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'ignored',
          error: 'invalid_product_item',
        });
        continue;
      }

      if (!item?.externalId) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'ignored',
          error: 'external_id_required',
        });
        continue;
      }

      if (piquimTenant) {
        item.images = [];
        item.hasImages = false;
      }

      const existing = existingByExternalId.get(item.externalId) || (piquimTenant ? existingBySku.get(item.sku) : null);

      if (item?.validationError) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action:
            item.operation === 'update'
              ? 'update'
              : item.operation === 'create'
                ? 'create'
                : existing
                  ? 'update'
                  : 'create',
          error: item.validationError.code || 'invalid_value_format',
          ...(item.validationError.detail ? { error_detail: item.validationError.detail } : {}),
          ...(item.validationError.field ? { error_field: item.validationError.field } : {}),
          ...(item.validationError.raw_value !== undefined ? { error_value: item.validationError.raw_value } : {}),
        });
        continue;
      }
      if (item.operation === 'create' && existing) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'create',
          error: 'external_id_already_exists',
          product_id: existing.id,
        });
        continue;
      }

      if (item.operation === 'update' && !existing) {
        failed += 1;
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: 'update',
          error: 'product_not_found',
        });
        continue;
      }

      const savepointName = `sync_item_${index + 1}`;
      await client.query(`SAVEPOINT ${savepointName}`);

      try {
        const categoryResolution = await resolveCategoryAssignmentForSync(client, {
          tenantId,
          item,
          existing,
          piquimTenant,
        });

        if (!existing) {
          const productData = buildProductDataFromSync({
            existingData: {},
            item,
            allowEditorialSync: true,
          });
          const insertRes = await client.query(
            [
              'insert into product_cache (',
              'tenant_id, erp_id, external_id, source_system, sku, name, description, price, price_wholesale, stock, brand, data,',
              'is_active_source, is_visible_web, admin_locked, deleted_at, last_sync_at',
              ') values (',
              '$1, $2, $3, $4, $5, $6, $7, $8, $9, greatest($10, 0), $11, $12::jsonb, $13, $14, $15, $16, $17',
              ') returning id',
            ].join(' '),
            [
              tenantId,
              item.externalId,
              item.externalId,
              item.sourceSystem,
              item.sku,
              item.name,
              item.description,
              item.hasPriceRetail ? item.priceRetail : 0,
              item.hasPriceWholesale ? item.priceWholesale : (item.hasPriceRetail ? item.priceRetail : 0),
              item.hasStock ? item.stock : 0,
              item.brand,
              JSON.stringify(productData),
              item.hasIsActive ? item.isActiveSource : true,
              true,
              false,
              item.deletedAt,
              syncedAt,
            ]
          );

          const productId = insertRes.rows[0].id;
          if (categoryResolution.shouldReplaceCategories && categoryResolution.categoryIds.length) {
            await replaceProductCategories(client, {
              tenantId,
              productId,
              categoryIds: categoryResolution.categoryIds,
            });
          }
          await upsertSyncMetadata(client, {
            tenantId,
            productId,
            externalId: item.externalId,
            sourceSystem: item.sourceSystem,
            lastSyncAt: syncedAt,
            rawPayload: item.rawPayload,
          });

          created += 1;
          categoriesCreated += categoryResolution.createdCount;
          const nextExisting = {
            id: productId,
            erp_id: item.externalId,
            external_id: item.externalId,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price: item.hasPriceRetail ? item.priceRetail : 0,
            price_wholesale: item.hasPriceWholesale ? item.priceWholesale : (item.hasPriceRetail ? item.priceRetail : 0),
            stock: item.hasStock ? item.stock : 0,
            brand: item.brand,
            data: productData,
            status: item.deletedAt ? 'archived' : 'active',
            admin_locked: false,
            deleted_at: item.deletedAt,
            is_active_source: item.hasIsActive ? item.isActiveSource : true,
            metadata_external_id: item.externalId,
          };
          existingByExternalId.set(item.externalId, nextExisting);
          if (piquimTenant && item.sku) {
            existingBySku.set(item.sku, nextExisting);
          }
          await client.query(`RELEASE SAVEPOINT ${savepointName}`);
          itemResults.push({
            ...baseResult,
            ok: true,
            status: 'created',
            action: 'create',
            product_id: productId,
            categories_created: categoryResolution.createdCount,
            category_ids: categoryResolution.categoryIds,
          });
          continue;
        }

        const allowEditorialSync = existing.admin_locked !== true;
        // Producto bloqueado en el panel: el precio que puso el comercio no lo pisa el sistema.
        const nextPrice = allowEditorialSync && item.hasPriceRetail ? item.priceRetail : Number(existing.price || 0);
        const nextPriceWholesale = allowEditorialSync && item.hasPriceWholesale
          ? item.priceWholesale
          : Number(existing.price_wholesale ?? nextPrice ?? 0);
        const nextStock = item.hasStock ? item.stock : Number(existing.stock || 0);
        const nextIsActiveSource = item.hasIsActive ? item.isActiveSource : existing.is_active_source !== false;
        const nextName = allowEditorialSync
          ? (item.hasName ? item.name : existing.name)
          : existing.name;
        const nextSku = allowEditorialSync
          ? (item.hasSku ? item.sku : existing.sku)
          : existing.sku;
        const nextDescription = allowEditorialSync
          ? (item.hasDescription ? item.description : existing.description)
          : existing.description;
        const nextBrand = allowEditorialSync
          ? (item.hasBrand ? item.brand : existing.brand)
          : existing.brand;
        const nextDeletedAt = allowEditorialSync && !existing.deleted_at && item.deletedAt
          ? item.deletedAt
          : existing.deleted_at;
        const nextData = buildProductDataFromSync({
          existingData: existing.data,
          item,
          allowEditorialSync,
        });

        await client.query(
          [
            'update product_cache',
            'set erp_id = $3,',
            'external_id = $4,',
            'source_system = $5,',
            'sku = $6,',
            'name = $7,',
            'description = $8,',
            'price = $9,',
            'price_wholesale = $10,',
            'stock = greatest($11, 0),',
            'brand = $12,',
            'data = $13::jsonb,',
            'is_active_source = $14,',
            'deleted_at = $15,',
            'last_sync_at = $16,',
            'updated_at = now()',
            'where tenant_id = $1 and id = $2',
          ].join(' '),
          [
            tenantId,
            existing.id,
            item.externalId,
            item.externalId,
            item.sourceSystem,
            nextSku,
            nextName,
            nextDescription,
            nextPrice,
            nextPriceWholesale,
            nextStock,
            nextBrand,
            JSON.stringify(nextData),
            nextIsActiveSource,
            nextDeletedAt,
            syncedAt,
          ]
        );

        if (allowEditorialSync && categoryResolution.shouldReplaceCategories) {
          await replaceProductCategories(client, {
            tenantId,
            productId: existing.id,
            categoryIds: categoryResolution.categoryIds,
          });
        }

        await upsertSyncMetadata(client, {
          tenantId,
          productId: existing.id,
          externalId: item.externalId,
          sourceSystem: item.sourceSystem,
          lastSyncAt: syncedAt,
          rawPayload: item.rawPayload,
        });

        updated += 1;
        categoriesCreated += categoryResolution.createdCount;
        existingByExternalId.set(item.externalId, {
          ...existing,
          erp_id: item.externalId,
          external_id: item.externalId,
          source_system: item.sourceSystem,
          sku: nextSku,
          name: nextName,
          description: nextDescription,
          price: nextPrice,
          price_wholesale: nextPriceWholesale,
          stock: nextStock,
          brand: nextBrand,
          data: nextData,
          deleted_at: nextDeletedAt,
          is_active_source: nextIsActiveSource,
          metadata_external_id: item.externalId,
        });
        if (piquimTenant && nextSku) {
          existingBySku.set(nextSku, existingByExternalId.get(item.externalId));
        }
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        itemResults.push({
          ...baseResult,
          ok: true,
          status: 'updated',
          action: 'update',
          product_id: existing.id,
          categories_created: categoryResolution.createdCount,
          category_ids: categoryResolution.categoryIds,
        });
      } catch (err) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        failed += 1;
        const mappedError = mapSyncItemError(err);
        itemResults.push({
          ...baseResult,
          ok: false,
          status: 'error',
          action: existing ? 'update' : 'create',
          error: mappedError.error,
          ...(mappedError.error_detail ? { error_detail: mappedError.error_detail } : {}),
        });
      }
    }

    await client.query('COMMIT');
    return {
      ok: failed === 0,
      partial: failed > 0 && (created > 0 || updated > 0),
      tenant_id: tenantId,
      source_system: sourceSystem,
      total: normalizedEntries.length,
      created,
      updated,
      failed,
      categories_created: categoriesCreated,
      item_results: itemResults,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
