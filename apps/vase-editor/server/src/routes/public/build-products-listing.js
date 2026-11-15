// Parte de public.js: groupProductsByVariation, mapReviewRow, isReviewsEnabled, buildProductsListing.
import { pool } from '../../db.js';
import { buildPublicProductSearchSql } from '../../services/publicProductSearch.js';
import { PUBLIC_PRODUCT_DATA_SQL } from '../../services/publicMedia.js';
import { MAX_SEARCH_LENGTH, PUBLIC_PRODUCT_CATEGORY_IDS_SQL, PUBLIC_PRODUCT_VISIBILITY_SQL, attachCategoryLabels, buildPricingContext } from './build-pricing-context.js';
import { getComparablePrice, getVariationDisplayLabel, mapProductRow, normalizeSortValue, parseBooleanQuery, parseNumericQuery, resolvePublicCategoryAliases, sortPublicProducts } from './map-product-row.js';

export function groupProductsByVariation(products, sort) {
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

export function mapReviewRow(row) {
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

export async function isReviewsEnabled(tenantId) {
  const settingsRes = await pool.query(
    'select commerce from tenant_settings where tenant_id = $1',
    [tenantId]
  );
  const commerce = settingsRes.rows[0]?.commerce || {};
  return commerce.reviews_enabled !== false;
}


export async function buildProductsListing(req) {
  const pricingContext = await buildPricingContext(req);
  const tenantId = req.tenant.id;
  const q = String(req.query.q || '').trim().slice(0, MAX_SEARCH_LENGTH);
  const category = req.query.category;
  const brand = req.query.brand;
  const minPrice = parseNumericQuery(req.query.minPrice);
  const maxPrice = parseNumericQuery(req.query.maxPrice);
  const inStockOnly = parseBooleanQuery(req.query.inStock, false);
  const grouped = parseBooleanQuery(req.query.grouped, false);
  const sort = normalizeSortValue(req.query.sort);

  // Cada pedido arma el listado completo y recorta la pagina al final, asi que traer
  // mas items por pedido no encarece la consulta: el subcatalogo de Piquim pide todo junto.
  const limit = Math.min(Math.max(parseInt(req.query.limit || '24', 10) || 24, 1), 500);
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const offset = (page - 1) * limit;

  const params = [tenantId];
  let where = `p.tenant_id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`;

  const searchSql = buildPublicProductSearchSql(q, params);
  if (searchSql) {
    where += ` and ${searchSql}`;
  }

  if (category) {
    const categoryAliases = resolvePublicCategoryAliases(category);
    params.push(categoryAliases.length ? categoryAliases : [String(category)]);
    where += [
      ' and p.id in (',
      'with recursive selected_categories as (',
      'select c.id',
      'from categories c',
      'where c.tenant_id = $1',
      `and (c.slug = any($${params.length}::text[]) or c.id::text = any($${params.length}::text[]))`,
      'union',
      'select child.id',
      'from categories child',
      'join selected_categories parent on nullif(child.data->>\'parent_id\', \'\') = parent.id::text',
      'where child.tenant_id = $1',
      ')',
      'select pc.product_id',
      'from product_categories pc',
      'where pc.category_id in (select id from selected_categories)',
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
    'select p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand,',
      `${PUBLIC_PRODUCT_DATA_SQL},`,
    PUBLIC_PRODUCT_CATEGORY_IDS_SQL,
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
  await attachCategoryLabels(paginatedItems, tenantId);

  return {
    page,
    limit,
    total,
    total_pages: total > 0 ? Math.ceil(total / limit) : 0,
    sort,
    grouped,
    items: paginatedItems,
  };
}
