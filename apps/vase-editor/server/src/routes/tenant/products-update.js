// Editar un producto existente.
import { tenantRouter } from './router.js';
import { normalizeSpecSheet } from '../../services/specSheet.js';
import { pool } from '../../db.js';
import { restoreProductImageRoutes } from '../../services/publicMedia.js';
import { getTenantId, isUuid, normalizeBrandName, parseBooleanInput, parseUuidArray } from './helpers-common.js';
import { fetchTenantProductRow } from './helpers-products.js';

tenantRouter.put('/products/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const productId = req.params.id;
  if (!isUuid(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      [
        'select id, sku, name, description, price, price_wholesale, stock, brand, data, external_id, source_system, is_visible_web, admin_locked',
        'from product_cache',
        "where tenant_id = $1 and id = $2 and status = 'active'",
      ].join(' '),
      [tenantId, productId]
    );
    if (!existingRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'product_not_found' });
    }

    const existing = existingRes.rows[0];
    const existingData = existing.data && typeof existing.data === 'object' ? existing.data : {};

    const hasCategoryPayload =
      Object.prototype.hasOwnProperty.call(req.body || {}, 'category_id') ||
      Object.prototype.hasOwnProperty.call(req.body || {}, 'category_ids');
    const hasFeaturedPayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_featured');
    const hasVisiblePayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_visible_web');
    const hasAdminLockedPayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'admin_locked');

    const rawName = req.body?.name ?? existing.name;
    const name = String(rawName || '').trim();
    if (!name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'name_required' });
    }

    const sku = req.body?.sku !== undefined ? String(req.body.sku || '').trim() || null : existing.sku;
    const shortDescription = Object.prototype.hasOwnProperty.call(req.body || {}, 'short_description')
      ? String(req.body?.short_description || '').trim() || null
      : (String(existingData.short_description || existingData.shortDescription || '').trim() || null);
    const longDescriptionSource = Object.prototype.hasOwnProperty.call(req.body || {}, 'long_description')
      ? req.body?.long_description
      : (
          Object.prototype.hasOwnProperty.call(req.body || {}, 'description')
            ? req.body?.description
            : (existingData.long_description || existingData.longDescription || existing.description)
        );
    const description = String(longDescriptionSource || '').trim() || null;
    const brand = req.body?.brand !== undefined
      ? normalizeBrandName(req.body.brand) || null
      : existing.brand;

    const price = req.body?.price !== undefined ? Number(req.body.price) : Number(existing.price || 0);
    const priceWholesale = req.body?.price_wholesale !== undefined
      ? Number(req.body.price_wholesale)
      : Number(existing.price_wholesale || 0);
    const stock = req.body?.stock !== undefined ? Number(req.body.stock) : Number(existing.stock || 0);

    if (!Number.isFinite(price)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_price' });
    }
    if (!Number.isFinite(priceWholesale)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_price_wholesale' });
    }
    if (!Number.isFinite(stock)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_stock' });
    }

    const rawImages = Object.prototype.hasOwnProperty.call(req.body || {}, 'images')
      ? restoreProductImageRoutes(req.body?.images, existingData.images, productId)
      : existingData.images;
    let imageData = [];
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      imageData = rawImages
        .map((img, index) => {
          if (typeof img === 'string') {
            return { url: img, alt: name, sku: sku || existing.sku || null, primary: index === 0 };
          }
          if (!img || typeof img !== 'object') return null;
          const url = img.url || img.src || '';
          if (!url) return null;
          return {
            url,
            alt: img.alt || name,
            sku: img.sku || sku || existing.sku || null,
            primary: img.primary === true || index === 0,
          };
        })
        .filter(Boolean);
    } else if (typeof rawImages === 'string' && rawImages.trim()) {
      imageData = [{ url: rawImages.trim(), alt: name, sku: sku || existing.sku || null, primary: true }];
    }

    const features = Object.prototype.hasOwnProperty.call(req.body || {}, 'features')
      ? (Array.isArray(req.body?.features) ? req.body.features : [])
      : (Array.isArray(existingData.features) ? existingData.features : []);
    const specifications = Object.prototype.hasOwnProperty.call(req.body || {}, 'specifications')
      ? (req.body?.specifications && typeof req.body.specifications === 'object' ? req.body.specifications : {})
      : (existingData.specifications && typeof existingData.specifications === 'object' ? existingData.specifications : {});
    const showSpecifications = Object.prototype.hasOwnProperty.call(req.body || {}, 'show_specifications')
      ? parseBooleanInput(req.body?.show_specifications, existingData.show_specifications !== false)
      : (existingData.show_specifications !== false);
    const collection = Object.prototype.hasOwnProperty.call(req.body || {}, 'collection')
      ? (req.body?.collection || null)
      : (existingData.collection || null);
    const variantGroup = Object.prototype.hasOwnProperty.call(req.body || {}, 'variant_group')
      ? String(req.body?.variant_group || '').trim() || null
      : (String(existingData.variant_group || existingData.variantGroup || '').trim() || null);
    const variantGroupLabel = Object.prototype.hasOwnProperty.call(req.body || {}, 'variant_group_label')
      ? String(req.body?.variant_group_label || '').trim() || null
      : (String(existingData.variant_group_label || existingData.variantGroupLabel || '').trim() || null);
    const variantLabel = Object.prototype.hasOwnProperty.call(req.body || {}, 'variant_label')
      ? String(req.body?.variant_label || '').trim() || null
      : (String(existingData.variant_label || existingData.variantLabel || existingData.variant || '').trim() || null);
    const isVariantRoot = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_variant_root')
      ? parseBooleanInput(req.body?.is_variant_root, false)
      : (existingData.is_variant_root === true || existingData.isVariantRoot === true);
    const deliveryTime = Object.prototype.hasOwnProperty.call(req.body || {}, 'delivery_time')
      ? (req.body?.delivery_time || null)
      : (existingData.delivery_time || null);
    const shippingDetails = Object.prototype.hasOwnProperty.call(req.body || {}, 'shipping_details')
      ? (req.body?.shipping_details || null)
      : (existingData.shipping_details || null);
    const warranty = Object.prototype.hasOwnProperty.call(req.body || {}, 'warranty')
      ? (req.body?.warranty || null)
      : (existingData.warranty || null);
    const specSheet = Object.prototype.hasOwnProperty.call(req.body || {}, 'spec_sheet')
      ? normalizeSpecSheet(req.body?.spec_sheet)
      : (existingData.spec_sheet || null);
    const isVisibleWeb = hasVisiblePayload
      ? parseBooleanInput(req.body?.is_visible_web, existing.is_visible_web !== false)
      : existing.is_visible_web !== false;
    const adminLocked = hasAdminLockedPayload
      ? parseBooleanInput(req.body?.admin_locked, existing.admin_locked === true)
      : existing.admin_locked === true;
    const externalId = Object.prototype.hasOwnProperty.call(req.body || {}, 'external_id')
      ? String(req.body?.external_id || '').trim() || null
      : (existing.external_id || null);
    const sourceSystem = Object.prototype.hasOwnProperty.call(req.body || {}, 'source_system')
      ? String(req.body?.source_system || '').trim() || null
      : (existing.source_system || null);

    const productData = {
      ...existingData,
      images: imageData,
      features,
      short_description: shortDescription,
      long_description: description,
      specifications,
      show_specifications: showSpecifications,
      collection,
      variant_group: variantGroup,
      variant_group_label: variantGroupLabel,
      variant_label: variantLabel,
      is_variant_root: isVariantRoot,
      delivery_time: deliveryTime,
      shipping_details: shippingDetails,
      warranty,
      spec_sheet: specSheet,
    };

    await client.query(
      [
        'update product_cache',
        'set sku = $3, name = $4, description = $5, price = $6, price_wholesale = $7, stock = greatest($8, 0), brand = $9, data = $10::jsonb,',
        'external_id = $11, source_system = $12, is_visible_web = $13, admin_locked = $14, updated_at = now()',
        'where tenant_id = $1 and id = $2',
      ].join(' '),
      [
        tenantId,
        productId,
        sku,
        name,
        description,
        price,
        priceWholesale,
        stock,
        brand,
        JSON.stringify(productData),
        externalId,
        sourceSystem,
        isVisibleWeb,
        adminLocked,
      ]
    );

    if (hasCategoryPayload) {
      const mergedCategoryIds = [];
      if (req.body?.category_id) mergedCategoryIds.push(req.body.category_id);
      if (Array.isArray(req.body?.category_ids)) mergedCategoryIds.push(...req.body.category_ids);

      const parsedCategories = parseUuidArray(mergedCategoryIds);
      if (!parsedCategories.ok) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid_category_ids' });
      }
      const selectedCategoryIds = parsedCategories.items;

      if (selectedCategoryIds.length) {
        const validCategoriesRes = await client.query(
          'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
          [tenantId, selectedCategoryIds]
        );
        if (validCategoriesRes.rowCount !== selectedCategoryIds.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'invalid_category_ids' });
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

    if (hasFeaturedPayload) {
      await client.query(
        'insert into product_overrides (tenant_id, product_id, featured) values ($1, $2, $3) on conflict (tenant_id, product_id) do update set featured = $3',
        [tenantId, productId, !!req.body?.is_featured]
      );
    }

    if (hasVisiblePayload) {
      await client.query(
        [
          'insert into product_overrides (tenant_id, product_id, hidden)',
          'values ($1, $2, $3)',
          'on conflict (tenant_id, product_id) do update set hidden = $3',
        ].join(' '),
        [tenantId, productId, !isVisibleWeb]
      );
    }

    await client.query('COMMIT');
    const item = await fetchTenantProductRow(pool, tenantId, productId);
    return res.json({ ok: true, id: productId, item });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});
