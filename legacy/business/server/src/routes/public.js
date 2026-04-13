import express from 'express';
import { resolveTenant } from '../middleware/tenant.js';
import { normalizePriceAdjustments } from '../services/pricing.js';
import { pool } from '../db.js';
import { resolveEffectiveProductPrice, resolvePricingProfile } from '../services/userPricing.js';
import {
  applyOfferDiscount,
  getTenantOffers,
  resolveBestOfferForProduct,
} from '../services/offers.js';

export const publicRouter = express.Router();

publicRouter.use(resolveTenant);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_PRODUCT_VISIBILITY_SQL = [
  "p.status = 'active'",
  'and p.deleted_at is null',
  'and coalesce(p.is_active_source, true) = true',
  'and coalesce(p.is_visible_web, true) = true',
  'and (o.hidden is null or o.hidden = false)',
].join(' ');

async function buildPricingContext(req) {
  const settingsRes = await pool.query(
    'select commerce from tenant_settings where tenant_id = $1',
    [req.tenant.id]
  );

  const adjustments = normalizePriceAdjustments(settingsRes.rows[0]?.commerce || {});
  const pricingProfile = await resolvePricingProfile({
    tenantId: req.tenant.id,
    user: req.user || null,
  });

  let offers = [];
  try {
    offers = await getTenantOffers(req.tenant.id, { onlyEnabled: true });
  } catch (err) {
    console.warn('Failed to load tenant offers for public pricing:', err?.message || err);
  }

  return {
    adjustments,
    pricingProfile,
    offers,
    userId: req.user?.id || null,
  };
}

function mapProductRow(row, pricingContext) {
  const { adjustments, pricingProfile, offers, userId } = pricingContext;
  const priceRetail = Number(row.price || 0);
  const priceWholesale = Number(row.price_wholesale || 0);
  const { retail, wholesale, effective, segment, priceList, pendingWholesale } =
    resolveEffectiveProductPrice({
      priceRetail,
      priceWholesale,
      profile: pricingProfile,
      adjustments,
    });

  const bestOffer = resolveBestOfferForProduct({
    offers,
    userId,
    categoryIds: row.category_ids || [],
  });
  const finalPrice = applyOfferDiscount(effective, bestOffer.percent);
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const specifications =
    data.specifications && typeof data.specifications === 'object' ? data.specifications : {};
  const rawVariationGroup = String(
    data.variant_group || data.variantGroup || ''
  ).trim();
  const rawVariationGroupLabel = String(
    data.variant_group_label || data.variantGroupLabel || ''
  ).trim();
  const rawVariationLabel = String(
    data.variant_label ||
      data.variantLabel ||
      data.variant ||
      specifications.color ||
      specifications.acabado ||
      specifications.terminacion ||
      specifications.modelo ||
      specifications.medida ||
      ''
  ).trim();
  const collectionGroup = String(data.collection || '').trim();
  const hasVariationSignal = Boolean(rawVariationGroup || rawVariationLabel);
  const variationGroup = rawVariationGroup || (hasVariationSignal ? collectionGroup : null);
  const isVariantRoot =
    data.is_variant_root === true ||
    data.isVariantRoot === true ||
    String(data.is_variant_root || data.isVariantRoot || '')
      .trim()
      .toLowerCase() === 'true';

  return {
    id: row.id,
    erp_id: row.erp_id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    short_description:
      data.short_description ||
      data.shortDescription ||
      null,
    long_description:
      data.long_description ||
      data.longDescription ||
      row.description ||
      null,
    show_specifications: data.show_specifications !== false,
    price: finalPrice,
    price_retail: retail,
    price_wholesale: wholesale,
    currency: row.currency,
    stock: row.stock,
    brand: row.brand,
    data,
    variation_group: variationGroup || null,
    variation_group_label: rawVariationGroupLabel || variationGroup || null,
    variation_label: rawVariationLabel || null,
    is_variant_root: isVariantRoot,
    pricing: {
      segment,
      pending_wholesale: pendingWholesale,
      price_list: priceList,
      offer: bestOffer.percent > 0
        ? {
            id: bestOffer.id,
            label: bestOffer.label,
            percent: bestOffer.percent,
          }
        : null,
    },
  };
}

function parseBooleanQuery(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumericQuery(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeSortValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (
    [
      'name-desc',
      'price-asc',
      'price-desc',
      'stock-asc',
      'stock-desc',
    ].includes(normalized)
  ) {
    return normalized;
  }
  return 'name-asc';
}

function getComparablePrice(item) {
  if (item?.price_range && Number.isFinite(Number(item.price_range.min))) {
    return Number(item.price_range.min);
  }
  return Number(item?.price || 0);
}

function getComparableStock(item) {
  return Number(item?.stock || 0);
}

function getVariationDisplayLabel(item) {
  return String(item?.variation_label || item?.sku || item?.name || '')
    .trim()
    .toLowerCase();
}

function sortPublicProducts(items, sort) {
  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  const next = [...items];
  next.sort((a, b) => {
    if (sort === 'name-desc') {
      return collator.compare(String(b?.name || ''), String(a?.name || ''));
    }
    if (sort === 'price-asc') {
      return getComparablePrice(a) - getComparablePrice(b);
    }
    if (sort === 'price-desc') {
      return getComparablePrice(b) - getComparablePrice(a);
    }
    if (sort === 'stock-asc') {
      return getComparableStock(a) - getComparableStock(b);
    }
    if (sort === 'stock-desc') {
      return getComparableStock(b) - getComparableStock(a);
    }
    return collator.compare(String(a?.name || ''), String(b?.name || ''));
  });
  return next;
}

function groupProductsByVariation(products, sort) {
  const groups = new Map();

  products.forEach((item) => {
    const rawGroup = String(item?.variation_group || '').trim();
    const key = rawGroup ? `group:${rawGroup.toLowerCase()}` : `single:${item.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        rawGroup: rawGroup || null,
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });

  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  const groupedItems = [...groups.values()].map(({ rawGroup, items }) => {
    const ordered = [...items].sort((a, b) => {
      if (a.is_variant_root && !b.is_variant_root) return -1;
      if (!a.is_variant_root && b.is_variant_root) return 1;
      if (!a.variation_label && b.variation_label) return -1;
      if (a.variation_label && !b.variation_label) return 1;
      return collator.compare(getVariationDisplayLabel(a), getVariationDisplayLabel(b));
    });

    const root =
      ordered.find((item) => item.is_variant_root) ||
      ordered.find((item) => !item.variation_label) ||
      ordered[0];
    const variations = [root, ...ordered.filter((item) => item.id !== root.id)].map((item) => ({
      ...item,
      is_root: item.id === root.id,
    }));
    const prices = variations.map((item) => getComparablePrice(item));
    const minPrice = prices.length ? Math.min(...prices) : getComparablePrice(root);
    const maxPrice = prices.length ? Math.max(...prices) : getComparablePrice(root);

    return {
      ...root,
      grouped: Boolean(rawGroup) && variations.length > 1,
      variation_group: rawGroup,
      variation_group_label:
        root.variation_group_label || rawGroup || root.name || 'Variaciones',
      variation_count: variations.length,
      price_range: {
        min: minPrice,
        max: maxPrice,
      },
      variations,
    };
  });

  return sortPublicProducts(groupedItems, sort);
}

function mapReviewRow(row) {
  if (!row) return null;
  const email = String(row.email || '').trim();
  const fallbackName = row.user_id ? 'Cliente' : 'Invitado';
  const authorName = email ? email.split('@')[0] : fallbackName;

  return {
    id: row.id,
    product_id: row.product_id,
    user_id: row.user_id,
    author_name: authorName,
    rating: Number(row.rating || 5),
    comment: row.comment || '',
    created_at: row.created_at,
  };
}

async function isReviewsEnabled(tenantId) {
  const settingsRes = await pool.query(
    'select commerce from tenant_settings where tenant_id = $1',
    [tenantId]
  );
  const commerce = settingsRes.rows[0]?.commerce || {};
  return commerce.reviews_enabled !== false;
}

publicRouter.get('/tenant', async (req, res, next) => {
  try {
    const result = await pool.query(
      'select branding, theme, commerce from tenant_settings where tenant_id = $1',
      [req.tenant.id]
    );
    const settings = result.rows[0] || { branding: {}, theme: {}, commerce: {} };
    return res.json({ tenant: req.tenant, settings });
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query(
      [
        'select c.id, c.name, c.slug,',
        "nullif(c.data->>'parent_id', '') as parent_id,",
        'parent.name as parent_name',
        'from categories c',
        "left join categories parent on parent.tenant_id = c.tenant_id and parent.id::text = nullif(c.data->>'parent_id', '')",
        'where c.tenant_id = $1',
        [
          "order by coalesce(parent.name, c.name) asc,",
          "case when nullif(c.data->>'parent_id', '') is null then 0 else 1 end asc,",
          'c.name asc',
        ].join(' '),
      ].join(' '),
      [req.tenant.id]
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/brands', async (req, res, next) => {
  try {
    const [settingsRes, result] = await Promise.all([
      pool.query(
        'select commerce from tenant_settings where tenant_id = $1',
        [req.tenant.id]
      ),
      pool.query(
        [
          'select distinct p.brand',
          'from product_cache p',
          'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
          'where p.tenant_id = $1',
          "and p.brand is not null and trim(p.brand) <> ''",
          `and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
        ].join(' '),
        [req.tenant.id]
      ),
    ]);

    const commerce = settingsRes.rows[0]?.commerce || {};
    const settingsBrands = Array.isArray(commerce.brands)
      ? commerce.brands.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const productBrands = result.rows.map((r) => String(r.brand || '').trim()).filter(Boolean);

    const merged = new Map();
    [...settingsBrands, ...productBrands].forEach((item) => {
      const key = item.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, item);
      }
    });

    const brands = [...merged.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return res.json(brands);
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/pages/:slug', async (req, res, next) => {
  try {
    const pageRes = await pool.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [req.tenant.id, req.params.slug]
    );
    if (!pageRes.rowCount) {
      return res.status(404).json({ error: 'page_not_found' });
    }

    const sectionsRes = await pool.query(
      'select id, type, enabled, sort_order, props from page_sections where page_id = $1 and state = $2 order by sort_order asc',
      [pageRes.rows[0].id, 'published']
    );

    const sections = sectionsRes.rows
      .filter((row) => row.enabled)
      .map((row) => ({
        id: row.id,
        type: row.type,
        enabled: row.enabled,
        sort_order: row.sort_order,
        props: row.props || {},
      }));

    return res.json({ slug: req.params.slug, sections });
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/products', async (req, res, next) => {
  try {
    const pricingContext = await buildPricingContext(req);
    const tenantId = req.tenant.id;
    const q = String(req.query.q || '').trim();
    const category = req.query.category;
    const brand = req.query.brand;
    const minPrice = parseNumericQuery(req.query.minPrice);
    const maxPrice = parseNumericQuery(req.query.maxPrice);
    const inStockOnly = parseBooleanQuery(req.query.inStock, false);
    const grouped = parseBooleanQuery(req.query.grouped, false);
    const sort = normalizeSortValue(req.query.sort);

    const limit = Math.min(parseInt(req.query.limit || '24', 10), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const offset = (page - 1) * limit;

    const params = [tenantId];
    let where = `p.tenant_id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`;

    if (q) {
      params.push(`%${q}%`);
      where += [
        ` and (p.name ilike $${params.length}`,
        `or p.description ilike $${params.length}`,
        `or coalesce(p.data->>'short_description', '') ilike $${params.length})`,
      ].join(' ');
    }

    if (category) {
      params.push(category);
      where += [
        ' and p.id in (',
        'select pc.product_id',
        'from product_categories pc',
        'join categories c on c.id = pc.category_id',
        `where c.slug = $${params.length}`,
        `or c.id::text = $${params.length}`,
        `or nullif(c.data->>'parent_id', '') = $${params.length}`,
        [
          "or nullif(c.data->>'parent_id', '') in (",
          'select parent.id::text',
          'from categories parent',
          `where parent.tenant_id = c.tenant_id and parent.slug = $${params.length}`,
          ')',
        ].join(' '),
        ')',
      ].join(' ');
    }

    if (req.query.featured === 'true') {
      where += ' and o.featured = true';
    }

    if (brand) {
      params.push(brand);
      where += ` and p.brand = $${params.length}`;
    }

    const sql = [
      'select p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand, p.data,',
      "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids",
      'from product_cache p',
      'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
      `where ${where}`,
      'order by p.name asc',
    ].join(' ');

    const productsRes = await pool.query(sql, params);
    let products = productsRes.rows.map((row) => mapProductRow(row, pricingContext));

    if (Number.isFinite(minPrice)) {
      products = products.filter((item) => getComparablePrice(item) >= minPrice);
    }
    if (Number.isFinite(maxPrice)) {
      products = products.filter((item) => getComparablePrice(item) <= maxPrice);
    }
    if (inStockOnly) {
      products = products.filter((item) => Number(item.stock || 0) > 0);
    }

    const filteredItems = grouped
      ? groupProductsByVariation(products, sort)
      : sortPublicProducts(products, sort);
    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(offset, offset + limit);

    return res.json({
      page,
      limit,
      total,
      total_pages: total > 0 ? Math.ceil(total / limit) : 0,
      sort,
      grouped,
      items: paginatedItems,
    });
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/products/:id', async (req, res, next) => {
  try {
    const pricingContext = await buildPricingContext(req);
    const id = req.params.id;

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const result = await pool.query(
      [
        'select p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand, p.data,',
        "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids",
        'from product_cache p',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where p.tenant_id = $1 and p.id = $2 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
      ].join(' '),
      [req.tenant.id, id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const row = result.rows[0];
    return res.json(mapProductRow(row, pricingContext));
  } catch (err) {
    return next(err);
  }
});

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
        'select distinct on (p.id) p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand, p.data,',
        "coalesce((select array_agg(pc2.category_id) from product_categories pc2 where pc2.product_id = p.id), '{}'::uuid[]) as category_ids",
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
        'select p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand, p.data,',
        "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids",
        'from collection_items ci',
        'join product_cache p on p.id = ci.product_id',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where ci.collection_id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
        'order by ci.sort_order asc',
      ].join(' '),
      [collection.id]
    );

    const products = productsRes.rows.map((row) => mapProductRow(row, pricingContext));

    return res.json({ collection, items: products });
  } catch (err) {
    return next(err);
  }
});
