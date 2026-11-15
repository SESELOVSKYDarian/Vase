// Parte de public.js: mediaRouter, publicRouter, publicListingCache, publicNamesCache, publicMediaCache, MAX_SEARCH_LENGTH y más.
import express from 'express';
import { resolveTenant } from '../../middleware/tenant.js';
import { normalizePriceAdjustments } from '../../services/pricing.js';
import { normalizePriceTierLabels } from '../../services/priceTierLabels.js';
import { pool } from '../../db.js';
import { resolvePricingProfile } from '../../services/userPricing.js';
import { loadSpecialPrices } from '../../services/specialPrices.js';
import { getTenantOffers } from '../../services/offers.js';
import { createLoadingCache } from '../../services/publicMedia.js';

// Las rutas de media las piden <img> y <video>, que no pueden mandar el header del tenant:
// van antes de resolveTenant y se identifican solo por el id del producto o de la seccion.
export const mediaRouter = express.Router();

export const publicRouter = express.Router();


// Catalogo anonimo: se arma una vez por minuto en vez de una vez por visita.
// La copia vencida se sigue sirviendo al instante (hasta 10 min) mientras se renueva en segundo plano.
export const publicListingCache = createLoadingCache({ ttlMs: 60_000, staleMs: 10 * 60_000, keepWarmMs: 45_000, maxEntries: 60, maxEntryBytes: 4_000_000, maxTotalBytes: 32_000_000 });
export const publicNamesCache = createLoadingCache({ ttlMs: 5 * 60_000, staleMs: 30 * 60_000, maxEntries: 50 });
export const publicMediaCache = createLoadingCache({
  ttlMs: 60 * 60_000,
  maxEntries: 400,
  sizeOf: (value) => value?.buffer?.length || 0,
  maxEntryBytes: 6_000_000,
  maxTotalBytes: 96_000_000,
});
export const MAX_SEARCH_LENGTH = 120;
export const LISTING_CACHE_PARAMS = ['q', 'category', 'brand', 'minPrice', 'maxPrice', 'inStock', 'grouped', 'sort', 'limit', 'page', 'featured'];

export function buildListingCacheKey(req) {
  const parts = LISTING_CACHE_PARAMS
    .filter((name) => req.query[name] !== undefined)
    .map((name) => `${name}=${String(req.query[name]).slice(0, MAX_SEARCH_LENGTH)}`);
  return `${req.tenant.id}|${parts.join('&')}`;
}
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PUBLIC_PRODUCT_VISIBILITY_SQL = [
  "p.status = 'active'",
  'and p.deleted_at is null',
  'and coalesce(p.is_active_source, true) = true',
  'and coalesce(p.is_visible_web, true) = true',
  'and (o.hidden is null or o.hidden = false)',
].join(' ');

export const PUBLIC_PRODUCT_CATEGORY_SELECT_SQL = [
  "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids,",
  [
    "coalesce((with recursive category_tree as (",
    "select c.id as leaf_id, c.id, c.name, nullif(c.data->>'parent_id', '') as parent_id, c.name::text as path, 0 as depth",
    'from product_categories pc',
    'join categories c on c.id = pc.category_id',
    'where pc.product_id = p.id and c.tenant_id = p.tenant_id',
    'union',
    "select tree.leaf_id, parent.id, parent.name, nullif(parent.data->>'parent_id', '') as parent_id, (parent.name || ' > ' || tree.path)::text as path, tree.depth + 1",
    'from category_tree tree',
    'join categories parent on parent.id::text = tree.parent_id',
    'where parent.tenant_id = p.tenant_id and tree.depth < 8',
    ')',
    "select array_agg(distinct name order by name) from category_tree), '{}'::text[]) as category_names,",
  ].join(' '),
  [
    "coalesce((with recursive category_tree as (",
    "select c.id as leaf_id, c.id, c.name, nullif(c.data->>'parent_id', '') as parent_id, c.name::text as path, 0 as depth",
    'from product_categories pc',
    'join categories c on c.id = pc.category_id',
    'where pc.product_id = p.id and c.tenant_id = p.tenant_id',
    'union',
    "select tree.leaf_id, parent.id, parent.name, nullif(parent.data->>'parent_id', '') as parent_id, (parent.name || ' > ' || tree.path)::text as path, tree.depth + 1",
    'from category_tree tree',
    'join categories parent on parent.id::text = tree.parent_id',
    'where parent.tenant_id = p.tenant_id and tree.depth < 8',
    ')',
    'select array_agg(path order by path)',
    'from (select distinct on (leaf_id) leaf_id, path from category_tree order by leaf_id, depth desc) paths),',
    "'{}'::text[]) as category_paths",
  ].join(' '),
].join(' ');

// Solo category_ids (barato): lo necesita el calculo de ofertas por categoria.
// Los nombres/rutas se resuelven despues, unicamente para la pagina devuelta.
export const PUBLIC_PRODUCT_CATEGORY_IDS_SQL =
  "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids";

export const PUBLIC_PRODUCT_CATEGORY_LABELS_SQL = [
  'with recursive category_tree as (',
  "select pc.product_id, c.id as leaf_id, c.id, c.name, nullif(c.data->>'parent_id', '') as parent_id, c.name::text as path, 0 as depth",
  'from product_categories pc',
  'join categories c on c.id = pc.category_id',
  'where pc.product_id = any($1::uuid[]) and c.tenant_id = $2',
  'union',
  "select tree.product_id, tree.leaf_id, parent.id, parent.name, nullif(parent.data->>'parent_id', '') as parent_id, (parent.name || ' > ' || tree.path)::text as path, tree.depth + 1",
  'from category_tree tree',
  'join categories parent on parent.id::text = tree.parent_id',
  'where parent.tenant_id = $2 and tree.depth < 8',
  '),',
  'names as (select product_id, array_agg(distinct name order by name) as category_names from category_tree group by product_id),',
  'paths as (',
  'select product_id, array_agg(path order by path) as category_paths',
  'from (select distinct on (product_id, leaf_id) product_id, leaf_id, path from category_tree order by product_id, leaf_id, depth desc) leaf_paths',
  'group by product_id',
  ')',
  'select names.product_id, names.category_names, paths.category_paths',
  'from names join paths on paths.product_id = names.product_id',
].join(' ');

export async function attachCategoryLabels(items, tenantId) {
  const targets = [];
  items.forEach((item) => {
    targets.push(item);
    if (Array.isArray(item.variations)) targets.push(...item.variations);
  });
  const ids = [...new Set(targets.filter((item) => item.category_ids?.length).map((item) => item.id))];
  if (!ids.length) return items;

  const labelsRes = await pool.query(PUBLIC_PRODUCT_CATEGORY_LABELS_SQL, [ids, tenantId]);
  const labelsById = new Map(labelsRes.rows.map((row) => [String(row.product_id), row]));
  targets.forEach((item) => {
    const labels = labelsById.get(String(item.id));
    if (!labels) return;
    item.category_names = labels.category_names || [];
    item.category_paths = labels.category_paths || [];
  });
  return items;
}

export async function buildPricingContext(req) {
  const settingsRes = await pool.query(
    'select commerce from tenant_settings where tenant_id = $1',
    [req.tenant.id]
  );

  const commerce = settingsRes.rows[0]?.commerce || {};
  const adjustments = normalizePriceAdjustments(commerce);
  const pricingProfile = await resolvePricingProfile({
    tenantId: req.tenant.id,
    user: req.user || null,

    commerce,
  });
  const specialPrices = await loadSpecialPrices({
    tenantId: req.tenant.id,
    userId: req.user?.id || null,
    priceListId: pricingProfile?.priceList?.id || null,
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
    priceTierLabels: normalizePriceTierLabels(commerce.price_tier_labels),
    offers,
    userId: req.user?.id || null,
    specialPrices,
  };
}

export function normalizeStoredPriceTiers(data, priceRetail, priceWholesale) {
  const raw = data?.price_tiers && typeof data.price_tiers === 'object' ? data.price_tiers : {};
  const tiers = [];

  for (let slot = 1; slot <= 10; slot += 1) {
    const key = `price_${slot}`;
    const value = raw[key];
    const parsed = Number(value);
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
