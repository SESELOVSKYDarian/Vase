// Cuánto ocupa una tienda. Las fotos están guardadas dentro de los productos y las páginas
// (como texto), así que el espacio se mide sobre las filas de la base.
import { pool } from '../../db.js';
import { listExistingStoreTables } from './tables.js';

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

// Fotos de productos: cuántas hay y cuánto pesan las que están guardadas adentro del producto.
const PRODUCT_IMAGES_SQL = [
  'select count(*)::bigint as count,',
  "coalesce(sum(case when left(src, 5) = 'data:' then octet_length(src) else 0 end), 0)::bigint as bytes",
  'from (',
  "select case when jsonb_typeof(im) = 'string' then im #>> '{}' else coalesce(im->>'url', im->>'src', '') end as src",
  'from product_cache p,',
  "jsonb_array_elements(case when jsonb_typeof(p.data->'images') = 'array' then p.data->'images' else '[]'::jsonb end) as im",
  'where p.tenant_id = $1',
  ') images',
].join(' ');

// Fotos del diseño (portadas, logo, banners): se cuentan por las que están pegadas dentro del texto.
const designImagesSql = (table) =>
  `select coalesce(sum((length(t::text) - length(replace(t::text, 'data:image/', ''))) / 11), 0)::bigint as count from ${table.name} t where ${table.where}`;

// Fotos de productos de la tienda, de la más pesada a la más liviana (para saber cuáles conviene achicar).
const PRODUCT_IMAGE_LIST_SQL = [
  'select p.id, p.name, (t.ord - 1)::int as idx,',
  "case when left(s.src, 5) = 'data:' then null else s.src end as url,",
  "case when left(s.src, 5) = 'data:' then octet_length(s.src) else 0 end as bytes",
  'from product_cache p,',
  "jsonb_array_elements(case when jsonb_typeof(p.data->'images') = 'array' then p.data->'images' else '[]'::jsonb end) with ordinality as t(im, ord),",
  "lateral (select case when jsonb_typeof(t.im) = 'string' then t.im #>> '{}' else coalesce(t.im->>'url', t.im->>'src', '') end as src) s",
  "where p.tenant_id = $1 and s.src <> ''",
  'order by bytes desc, p.name asc limit $2',
].join(' ');

export async function listTenantProductImages(tenantId, limit = 240, db = pool) {
  const result = await db.query(PRODUCT_IMAGE_LIST_SQL, [tenantId, limit]);
  return result.rows.map((row) => ({
    productId: row.id,
    productName: row.name || 'Producto',
    index: Number(row.idx),
    url: row.url && /^https?:\/\//i.test(row.url) ? row.url : null,
    bytes: Number(row.bytes || 0),
  }));
}

export function invalidateTenantUsage(tenantId) {
  cache.delete(String(tenantId));
}

/** Mide el espacio de una tienda. Tarda (lee todas sus filas), por eso se guarda unos minutos. */
export async function measureTenantUsage(tenantId, { fresh = false, db = pool } = {}) {
  const key = String(tenantId);
  const cached = cache.get(key);
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.usage;

  const tables = await listExistingStoreTables(db);
  const groups = { design: 0, catalog: 0, orders: 0 };
  for (const table of tables) {
    const result = await db.query(
      `select coalesce(sum(octet_length(t::text)), 0)::bigint as bytes from ${table.name} t where ${table.where}`,
      [tenantId]
    );
    groups[table.group] += Number(result.rows[0]?.bytes || 0);
  }

  let imageCount = 0;
  let imageBytes = 0;
  if (tables.some((table) => table.name === 'product_cache')) {
    const result = await db.query(PRODUCT_IMAGES_SQL, [tenantId]);
    imageCount += Number(result.rows[0]?.count || 0);
    imageBytes += Number(result.rows[0]?.bytes || 0);
  }
  for (const table of tables.filter((item) => item.group === 'design')) {
    const result = await db.query(designImagesSql(table), [tenantId]);
    imageCount += Number(result.rows[0]?.count || 0);
  }

  const totalBytes = groups.design + groups.catalog + groups.orders;
  const usage = {
    imageCount,
    totalBytes,
    breakdown: {
      images: Math.min(imageBytes, groups.catalog),
      catalog: Math.max(0, groups.catalog - imageBytes),
      orders: groups.orders,
      design: groups.design,
    },
    measuredAt: new Date().toISOString(),
  };
  cache.set(key, { at: Date.now(), usage });
  return usage;
}
