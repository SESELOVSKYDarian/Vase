// Crear un producto nuevo.
import { tenantRouter } from './router.js';
import { normalizeSpecSheet } from '../../services/specSheet.js';
import { pool } from '../../db.js';
import { getTenantId, parseBooleanInput, parseUuidArray } from './helpers-common.js';
import { fetchTenantProductRow } from './helpers-products.js';

tenantRouter.post('/products', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const {
    sku,
    name,
    price,
    price_wholesale,
    stock,
    brand,
    description,
    short_description,
    long_description,
    images,
    is_featured,
    category_id,
    category_ids,
    features,
    specifications,
    show_specifications,
    collection,
    variant_group,
    variant_group_label,
    variant_label,
    is_variant_root,
    delivery_time,
    shipping_details,
    warranty,
    spec_sheet,
    external_id,
    source_system,
    is_visible_web,
    admin_locked,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }

  const mergedCategoryIds = [];
  if (category_id) mergedCategoryIds.push(category_id);
  if (Array.isArray(category_ids)) {
    mergedCategoryIds.push(...category_ids);
  }
  const parsedCategories = parseUuidArray(mergedCategoryIds);
  if (!parsedCategories.ok) {
    return res.status(400).json({ error: 'invalid_category_ids' });
  }
  const selectedCategoryIds = parsedCategories.items;

  // Process images array
  let imageData = [];
  if (Array.isArray(images) && images.length > 0) {
    imageData = images.map((img, index) => ({
      url: img.url || img,
      alt: img.alt || name,
      sku: img.sku || sku || null,
      primary: img.primary === true || index === 0 // First image is primary by default
    }));
  } else if (typeof images === 'string') {
    // Backward compatibility: single URL string
    imageData = [{ url: images, alt: name, sku: sku || null, primary: true }];
  }

  const shortDescription = String(short_description || '').trim() || null;
  const normalizedLongDescription = String((long_description ?? description) || '').trim() || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const externalId = String(external_id || '').trim() || null;
    const sourceSystem = String(source_system || '').trim() || null;
    const isVisibleWeb = parseBooleanInput(is_visible_web, true);
    const adminLocked = parseBooleanInput(admin_locked, false);

    const productData = {
      images: imageData,
      features: features || [],
      short_description: shortDescription,
      long_description: normalizedLongDescription,
      specifications: specifications || {},
      show_specifications: parseBooleanInput(show_specifications, true),
      collection: collection || null,
      variant_group: String(variant_group || '').trim() || null,
      variant_group_label: String(variant_group_label || '').trim() || null,
      variant_label: String(variant_label || '').trim() || null,
      is_variant_root: parseBooleanInput(is_variant_root, false),
      delivery_time: delivery_time || null,
      shipping_details: shipping_details || null,
      warranty: warranty || null,
      spec_sheet: normalizeSpecSheet(spec_sheet),
    };

    const result = await client.query(
      [
        'insert into product_cache (tenant_id, erp_id, external_id, source_system, sku, name, price, price_wholesale, stock, brand, description, data, is_visible_web, admin_locked)',
        'values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14)',
        'returning id',
      ].join(' '),
      [
        tenantId,
        externalId,
        externalId,
        sourceSystem,
        sku || null,
        name,
        price || 0,
        price_wholesale || price || 0,
        stock || 0,
        brand || null,
        normalizedLongDescription,
        JSON.stringify(productData),
        isVisibleWeb,
        adminLocked,
      ]
    );

    const productId = result.rows[0].id;

    // Associate product with all selected categories.
    if (selectedCategoryIds.length) {
      const categoryRes = await client.query(
        'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
        [tenantId, selectedCategoryIds]
      );
      if (categoryRes.rowCount !== selectedCategoryIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid_category_ids' });
      }

      await client.query(
        [
          'insert into product_categories (product_id, category_id)',
          'select $1, unnest($2::uuid[])',
          'on conflict do nothing',
        ].join(' '),
        [productId, selectedCategoryIds]
      );
    }

    if (is_featured) {
      await client.query(
        'insert into product_overrides (tenant_id, product_id, featured) values ($1, $2, true) on conflict (tenant_id, product_id) do update set featured = true',
        [tenantId, productId]
      );
    }

    await client.query(
      [
        'insert into product_overrides (tenant_id, product_id, hidden)',
        'values ($1, $2, $3)',
        'on conflict (tenant_id, product_id) do update set hidden = $3',
      ].join(' '),
      [tenantId, productId, !isVisibleWeb]
    );

    if (externalId && sourceSystem) {
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
        [tenantId, productId, externalId, sourceSystem, new Date(), JSON.stringify({ source: 'tenant_admin_manual_create' })]
      );
    }

    await client.query('COMMIT');
    const item = await fetchTenantProductRow(pool, tenantId, productId);
    return res.json({ id: productId, ok: true, item });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Image Upload Endpoint
