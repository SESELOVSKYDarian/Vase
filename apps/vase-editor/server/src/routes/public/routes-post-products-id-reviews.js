// Rutas de public.js: get-products-id-reviews, post-products-id-reviews, get-products-id-related, get-collections-slug.
import { pool } from '../../db.js';
import { PUBLIC_PRODUCT_DATA_SQL } from '../../services/publicMedia.js';
import { PUBLIC_PRODUCT_CATEGORY_IDS_SQL, PUBLIC_PRODUCT_CATEGORY_SELECT_SQL, PUBLIC_PRODUCT_VISIBILITY_SQL, UUID_REGEX, attachCategoryLabels, buildPricingContext, publicRouter } from './build-pricing-context.js';
import { mapProductRow } from './map-product-row.js';
import { isReviewsEnabled, mapReviewRow } from './build-products-listing.js';

publicRouter.get('/products/:id/reviews', async (req, res, next) => {
  try {
    const productId = req.params.id;
    if (!UUID_REGEX.test(productId)) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const productRes = await pool.query(
      [
        'select p.id',
        'from product_cache p',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where p.tenant_id = $1 and p.id = $2 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
      ].join(' '),
      [req.tenant.id, productId]
    );
    if (!productRes.rowCount) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const enabled = await isReviewsEnabled(req.tenant.id);
    if (!enabled) {
      return res.json({ enabled: false, items: [] });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const reviewsRes = await pool.query(
      [
        'select r.id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, u.email',
        'from product_reviews r',
        'left join users u on u.id = r.user_id',
        'where r.tenant_id = $1 and r.product_id = $2 and r.status = $3',
        'order by r.created_at desc',
        'limit $4',
      ].join(' '),
      [req.tenant.id, productId, 'published', limit]
    );

    return res.json({
      enabled: true,
      items: reviewsRes.rows.map(mapReviewRow).filter(Boolean),
    });
  } catch (err) {
    return next(err);
  }
});

publicRouter.post('/products/:id/reviews', async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const productId = req.params.id;
    if (!UUID_REGEX.test(productId)) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    if (req.user.tenantId && req.user.tenantId !== req.tenant.id) {
      return res.status(403).json({ error: 'tenant_mismatch' });
    }

    const membershipRes = await pool.query(
      'select status from user_tenants where tenant_id = $1 and user_id = $2',
      [req.tenant.id, req.user.id]
    );
    if (!membershipRes.rowCount) {
      return res.status(403).json({ error: 'not_tenant_member' });
    }
    if (membershipRes.rows[0].status === 'inactive') {
      return res.status(403).json({ error: 'user_inactive' });
    }

    const enabled = await isReviewsEnabled(req.tenant.id);
    if (!enabled) {
      return res.status(403).json({ error: 'reviews_disabled' });
    }

    const productRes = await pool.query(
      [
        'select p.id',
        'from product_cache p',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where p.tenant_id = $1 and p.id = $2 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
      ].join(' '),
      [req.tenant.id, productId]
    );
    if (!productRes.rowCount) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const comment = String(req.body?.comment || '').trim();
    if (!comment) {
      return res.status(400).json({ error: 'comment_required' });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ error: 'comment_too_long' });
    }

    const rating = Number(req.body?.rating || 5);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'invalid_rating' });
    }

    const insertRes = await pool.query(
      [
        'insert into product_reviews (tenant_id, product_id, user_id, rating, comment, status)',
        'values ($1, $2, $3, $4, $5, $6)',
        'returning id',
      ].join(' '),
      [req.tenant.id, productId, req.user.id, rating, comment, 'published']
    );

    const reviewRes = await pool.query(
      [
        'select r.id, r.product_id, r.user_id, r.rating, r.comment, r.created_at, u.email',
        'from product_reviews r',
        'left join users u on u.id = r.user_id',
        'where r.id = $1',
      ].join(' '),
      [insertRes.rows[0].id]
    );

    return res.status(201).json({
      ok: true,
      review: mapReviewRow(reviewRes.rows[0]),
    });
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/products/:id/related', async (req, res, next) => {
  try {
    const pricingContext = await buildPricingContext(req);
    const id = req.params.id;
    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const limit = Math.min(parseInt(req.query.limit || '4', 10), 12);

    const categoriesRes = await pool.query(
      [
        'select pc.category_id',
        'from product_categories pc',
        'join product_cache p on p.id = pc.product_id',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where p.tenant_id = $1 and p.id = $2 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
      ].join(' '),
      [req.tenant.id, id]
    );

    const categoryIds = categoriesRes.rows.map((row) => row.category_id);
    if (!categoryIds.length) {
      return res.json({ items: [] });
    }

    const relatedRes = await pool.query(
      [
        'select distinct on (p.id) p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand,',
        `${PUBLIC_PRODUCT_DATA_SQL},`,
        PUBLIC_PRODUCT_CATEGORY_SELECT_SQL,
        'from product_cache p',
        'join product_categories pc on pc.product_id = p.id',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where p.tenant_id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
        'and p.id <> $2',
        'and pc.category_id = any($3::uuid[])',
        'order by p.id, p.name asc',
        'limit $4',
      ].join(' '),
      [req.tenant.id, id, categoryIds, limit]
    );

    const items = relatedRes.rows.map((row) => mapProductRow(row, pricingContext));

    return res.json({ items });
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/collections/:slug', async (req, res, next) => {
  try {
    const pricingContext = await buildPricingContext(req);
    const collectionRes = await pool.query(
      'select id, name, slug from product_collections where tenant_id = $1 and slug = $2',
      [req.tenant.id, req.params.slug]
    );
    if (!collectionRes.rowCount) {
      return res.status(404).json({ error: 'collection_not_found' });
    }

    const collection = collectionRes.rows[0];
    const productsRes = await pool.query(
      [
        'select p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand,',
        `${PUBLIC_PRODUCT_DATA_SQL},`,
        PUBLIC_PRODUCT_CATEGORY_IDS_SQL,
        'from collection_items ci',
        'join product_cache p on p.id = ci.product_id',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where ci.collection_id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
        'order by ci.sort_order asc',
      ].join(' '),
      [collection.id]
    );

    const products = productsRes.rows.map((row) => mapProductRow(row, pricingContext));
    await attachCategoryLabels(products, req.tenant.id);

    return res.json({ collection, items: products });
  } catch (err) {
    return next(err);
  }
});

// --- Media (imagenes y videos guardados como data URI en la base) ---------------------------
