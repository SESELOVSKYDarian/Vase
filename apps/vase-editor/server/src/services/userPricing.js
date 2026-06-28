import { pool } from '../db.js';
import { resolveAdjustedPrices } from './pricing.js';

const VALID_PRICE_LIST_TYPES = new Set(['retail', 'wholesale', 'special']);
let pricingSchemaReady = false;
let pricingSchemaPromise = null;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function ensurePricingSchema() {
  if (pricingSchemaReady) return;

  if (!pricingSchemaPromise) {
    pricingSchemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query(
          [
            'create table if not exists price_lists (',
            'id uuid primary key default gen_random_uuid(),',
            'tenant_id uuid not null references tenants(id) on delete cascade,',
            'name text not null,',
            "type text not null check (type in ('retail', 'wholesale', 'special')),",
            "rules_json jsonb not null default '{}'::jsonb,",
            'created_at timestamptz not null default now()',
            ')',
          ].join(' ')
        );

        await client.query(
          'create unique index if not exists price_lists_tenant_name_idx on price_lists(tenant_id, name)'
        );

        await client.query(
          [
            'create table if not exists user_price_list (',
            'tenant_id uuid not null references tenants(id) on delete cascade,',
            'user_id uuid not null references users(id) on delete cascade,',
            'price_list_id uuid not null references price_lists(id) on delete cascade,',
            'assigned_at timestamptz not null default now(),',
            'primary key (tenant_id, user_id)',
            ')',
          ].join(' ')
        );

        await client.query(
          'create index if not exists user_price_list_tenant_idx on user_price_list(tenant_id, user_id)'
        );

        pricingSchemaReady = true;
      } finally {
        client.release();
      }
    })().catch((err) => {
      pricingSchemaPromise = null;
      throw err;
    });
  }

  await pricingSchemaPromise;
}

export function normalizePriceListRules(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const percent = toNumber(source.percent, 0);
  const forceSegmentRaw = typeof source.force_segment === 'string'
    ? source.force_segment.toLowerCase()
    : '';
  const forceSegment = forceSegmentRaw === 'retail' || forceSegmentRaw === 'wholesale'
    ? forceSegmentRaw
    : null;
  const minPrice = source.min_price != null ? toNumber(source.min_price, null) : null;
  const maxPrice = source.max_price != null ? toNumber(source.max_price, null) : null;

  return {
    percent,
    forceSegment,
    minPrice: Number.isFinite(minPrice) ? minPrice : null,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
  };
}

function applyPriceListRules(basePrice, rawRules = {}) {
  const safeBase = toNumber(basePrice, 0);
  const rules = normalizePriceListRules(rawRules);
  let nextPrice = safeBase;

  if (rules.percent !== 0) {
    nextPrice = nextPrice * (1 + rules.percent / 100);
  }
  if (rules.minPrice != null) {
    nextPrice = Math.max(nextPrice, rules.minPrice);
  }
  if (rules.maxPrice != null) {
    nextPrice = Math.min(nextPrice, rules.maxPrice);
  }

  const rounded = Math.round(nextPrice * 100) / 100;
  return Math.max(0, rounded);
}

async function getUserPriceList(tenantId, userId) {
  await ensurePricingSchema();
  const result = await pool.query(
    [
      'select pl.id, pl.name, pl.type, pl.rules_json',
      'from user_price_list upl',
      'join price_lists pl on pl.id = upl.price_list_id',
      'where upl.tenant_id = $1 and upl.user_id = $2',
      'limit 1',
    ].join(' '),
    [tenantId, userId]
  );
  return result.rows[0] || null;
}

async function getAutoPriceList(tenantId, segment = 'retail') {
  await ensurePricingSchema();
  const wantedType = segment === 'wholesale' ? 'wholesale' : 'retail';
  const result = await pool.query(
    [
      'select id, name, type, rules_json',
      'from price_lists',
      'where tenant_id = $1 and type = $2',
      'order by created_at asc',
      'limit 1',
    ].join(' '),
    [tenantId, wantedType]
  );
  return result.rows[0] || null;
}

export async function resolvePricingProfile({ tenantId, user }) {
  const role = user?.role || 'retail';
  const status = user?.status || 'active';
  const pendingWholesale = role === 'wholesale' && status !== 'active';
  const allowWholesale = role === 'wholesale' && status === 'active';
  const segment = allowWholesale ? 'wholesale' : 'retail';

  if (!tenantId || !user?.id) {
    return {
      segment,
      allowWholesale,
      pendingWholesale,
      priceList: null,
      priceListSource: 'none',
    };
  }
  try {
    const manualPriceList = await getUserPriceList(tenantId, user.id);
    if (manualPriceList) {
      return {
        segment,
        allowWholesale,
        pendingWholesale,
        priceList: manualPriceList,
        priceListSource: 'manual',
      };
    }

    const autoPriceList = await getAutoPriceList(tenantId, segment);
    return {
      segment,
      allowWholesale,
      pendingWholesale,
      priceList: autoPriceList,
      priceListSource: autoPriceList ? 'automatic' : 'none',
    };
  } catch (err) {
    // Fallback to segment pricing if the pricing-list schema is unavailable.
    console.warn('Pricing schema unavailable, using default segment pricing:', err?.message || err);
    return {
      segment,
      allowWholesale,
      pendingWholesale,
      priceList: null,
      priceListSource: 'none',
    };
  }
}

function resolveSegmentForList({ profile, rules }) {
  if (rules.forceSegment) {
    if (rules.forceSegment === 'wholesale' && !profile.allowWholesale) {
      return 'retail';
    }
    return rules.forceSegment;
  }

  const listType = profile.priceList?.type;
  if (!VALID_PRICE_LIST_TYPES.has(listType)) {
    return profile.segment;
  }

  if (listType === 'retail') return 'retail';
  if (listType === 'wholesale') {
    return profile.allowWholesale ? 'wholesale' : 'retail';
  }

  return profile.segment;
}

export function resolveEffectiveProductPrice({
  priceRetail,
  priceWholesale,
  adjustments,
  profile,
}) {
  const safeProfile = profile || {
    segment: 'retail',
    allowWholesale: false,
    pendingWholesale: false,
    priceList: null,
    priceListSource: 'none',
  };

  const adjusted = resolveAdjustedPrices({
    priceRetail,
    priceWholesale,
    allowWholesale: safeProfile.allowWholesale,
    adjustments,
  });
  const rules = normalizePriceListRules(safeProfile.priceList?.rules_json || {});
  const priceSegment = resolveSegmentForList({ profile: safeProfile, rules });
  const basePrice =
    priceSegment === 'wholesale' && adjusted.wholesale != null
      ? adjusted.wholesale
      : adjusted.retail;
  const effective = applyPriceListRules(basePrice, rules);

  return {
    retail: adjusted.retail,
    wholesale: safeProfile.allowWholesale && adjusted.wholesale != null ? adjusted.wholesale : null,
    effective,
    segment: priceSegment,
    priceList: safeProfile.priceList
      ? {
          id: safeProfile.priceList.id,
          name: safeProfile.priceList.name,
          type: safeProfile.priceList.type,
          source: safeProfile.priceListSource,
        }
      : null,
    pendingWholesale: !!safeProfile.pendingWholesale,
  };
}

export async function ensureDefaultPriceLists(tenantId) {
  if (!tenantId) return;
  await ensurePricingSchema();
  const countRes = await pool.query(
    'select count(*)::int as total from price_lists where tenant_id = $1',
    [tenantId]
  );
  const total = Number(countRes.rows[0]?.total || 0);
  if (total > 0) return;

  await pool.query(
    [
      'insert into price_lists (tenant_id, name, type, rules_json)',
      'values',
      "($1, 'Retail', 'retail', '{}'::jsonb),",
      "($1, 'Mayorista', 'wholesale', '{}'::jsonb),",
      "($1, 'Especial', 'special', '{}'::jsonb)",
    ].join(' '),
    [tenantId]
  );
}
